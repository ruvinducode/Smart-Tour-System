"""
Notification helpers — reliable delivery to users and drivers.
"""

from __future__ import annotations

from sqlalchemy import func, or_

from app import db
from app.models import Booking, Driver, Notification, TourPlan, User, Vehicle
from app.services.sms_service import send_sms_notification
from app.services.vehicle_matching_service import (
    find_approved_drivers_for_vehicle_type,
    normalize_vehicle_type,
    vehicle_types_match,
)


def _driver_recipient_email(driver: Driver) -> str | None:
    if driver.email:
        return driver.email.strip().lower()
    return None


def notify_driver(driver: Driver, subject: str, message: str, tour_id: int | None = None) -> Notification:
    note = Notification(
        recipient_email=_driver_recipient_email(driver),
        recipient_driver_id=driver.id,
        subject=subject,
        message=message,
        status="sent",
        tour_id=tour_id,
    )
    db.session.add(note)
    return note


def notify_user_email(email: str | None, subject: str, message: str, tour_id: int | None = None) -> None:
    if not email:
        return
    db.session.add(
        Notification(
            recipient_email=email.strip().lower(),
            subject=subject,
            message=message,
            status="sent",
            tour_id=tour_id,
        )
    )


def notify_drivers_new_tour(tour: TourPlan, vehicle_type: str, total_distance_km: float) -> int:
    """Notify every approved driver whose vehicle type matches the tour."""
    drivers = find_approved_drivers_for_vehicle_type(vehicle_type)
    canonical = normalize_vehicle_type(vehicle_type) or vehicle_type
    sent = 0

    for driver in drivers:
        already = Notification.query.filter_by(
            recipient_driver_id=driver.id,
            tour_id=tour.id,
            subject="New Tour Request",
        ).first()
        if already:
            continue

        message = (
            f"A new tour request matching your vehicle ({canonical}) is available. "
            f"Distance: {total_distance_km}km. Open your dashboard to accept or bid."
        )
        notify_driver(driver, "New Tour Request", message, tour.id)

        if driver.phone:
            sms_msg = (
                f"Smart Tour: New {canonical} trip request! {total_distance_km}km. "
                "Check your dashboard to accept or bid."
            )
            send_sms_notification(driver.phone, sms_msg)
        sent += 1

    return sent


def notify_driver_pending_tours(driver: Driver) -> int:
    """When a driver is approved, alert them about open planned tours for their vehicle."""
    if not driver.is_approved:
        return 0

    vehicle_ids = [
        v.id
        for v in Vehicle.query.all()
        if vehicle_types_match(v.type, driver.vehicle_type)
    ]
    if not vehicle_ids:
        return 0

    open_tours = (
        TourPlan.query.outerjoin(Booking, Booking.tour_id == TourPlan.id)
        .filter(
            TourPlan.status == "planned",
            TourPlan.vehicle_id.in_(vehicle_ids),
            or_(Booking.id.is_(None), Booking.driver_id.is_(None)),
        )
        .all()
    )

    sent = 0
    for tour in open_tours:
        already = Notification.query.filter_by(
            recipient_driver_id=driver.id,
            tour_id=tour.id,
            subject="New Tour Request",
        ).first()
        if already:
            continue
        distance = tour.total_distance_km or 0
        canonical = normalize_vehicle_type(driver.vehicle_type) or driver.vehicle_type
        notify_driver(
            driver,
            "New Tour Request",
            f"A tour request matching your vehicle ({canonical}) is available. Distance: {distance}km.",
            tour.id,
        )
        sent += 1
    return sent


def get_notifications_for_driver(driver: Driver) -> list[Notification]:
    filters = [Notification.recipient_driver_id == driver.id]
    if driver.email:
        filters.append(func.lower(Notification.recipient_email) == driver.email.strip().lower())

    return (
        Notification.query.filter(or_(*filters))
        .order_by(Notification.created_at.desc())
        .all()
    )


def notification_owned_by_caller(notif: Notification, role: str, user_id: int) -> bool:
    if role == "driver":
        driver = Driver.query.get(user_id)
        if not driver:
            return False
        if notif.recipient_driver_id == driver.id:
            return True
        if driver.email and notif.recipient_email:
            return notif.recipient_email.strip().lower() == driver.email.strip().lower()
        return False

    user = User.query.get(user_id)
    if not user or not user.email or not notif.recipient_email:
        return False
    return notif.recipient_email.strip().lower() == user.email.strip().lower()
