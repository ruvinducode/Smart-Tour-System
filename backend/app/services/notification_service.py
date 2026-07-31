"""
Notification helpers — reliable delivery to users and drivers.
"""

from __future__ import annotations

from sqlalchemy import func, or_

from app import db
from app.models import Booking, Driver, Notification, TourPlan, User, Vehicle
from app.services.sms_service import send_sms_notification
from app.services.email_service import send_email, _wrap_html
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


def notify_driver_locations_changed(tour: TourPlan, driver: Driver) -> Notification:
    """Sent when a traveler adds/removes a stop on a tour that's already
    ongoing — the driver's live map polls tour details periodically and will
    pick up the new stop list on its own, but they should also get an
    explicit heads-up that the route just changed under them mid-trip."""
    return notify_driver(
        driver,
        "Trip Stops Updated",
        f"The traveler has updated the stops for Tour #{tour.id}. "
        "Check your map for the new route.",
        tour.id,
    )


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

        driver_email = _driver_recipient_email(driver)
        if driver_email:
            send_email(
                driver_email,
                "New Tour Request Available",
                _wrap_html(
                    "New Tour Request",
                    f"<p>Hi {driver.full_name},</p>"
                    f"<p>{message}</p>",
                    theme="neutral",
                ),
            )
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


def notify_driver_registered(driver: Driver) -> bool:
    """Sent once at registration — confirms receipt, sets pending-approval expectation."""
    email = _driver_recipient_email(driver)
    if not email:
        return False
    return send_email(
        email,
        "Application Received — airbnctours",
        _wrap_html(
            "Application Received",
            f"<p>Hi {driver.full_name},</p>"
            "<p>Thanks for registering as a driver. Your application is now "
            "waiting for admin approval — we'll email you as soon as it's reviewed.</p>",
            theme="green",
        ),
    )


def notify_driver_approved(driver: Driver) -> bool:
    """Sent when an admin approves a driver — the account becomes usable."""
    email = _driver_recipient_email(driver)
    if not email:
        return False
    return send_email(
        email,
        "You're Approved! — airbnctours",
        _wrap_html(
            "You're Approved",
            f"<p>Hi {driver.full_name},</p>"
            "<p>Your driver account has been approved. You can now log in and "
            "start accepting tour requests.</p>",
            theme="blue",
        ),
    )


def notify_driver_rejected(driver_name: str, driver_email: str | None) -> bool:
    """Sent when an admin rejects/removes a driver application."""
    if not driver_email:
        return False
    return send_email(
        driver_email,
        "Application Update — airbnctours",
        _wrap_html(
            "Application Not Approved",
            f"<p>Hi {driver_name},</p>"
            "<p>Thanks for your interest in driving with us. After review, we're "
            "unable to approve your application at this time.</p>",
            theme="red",
            badge="REJECTED",
        ),
    )


def notify_user_registered(user: User) -> bool:
    """Welcome email sent once at customer registration."""
    if not user.email:
        return False
    return send_email(
        user.email,
        "Welcome to airbnctours",
        _wrap_html(
            f"Welcome, {user.full_name}",
            "<p>Your account has been created. You're ready to start planning "
            "your Sri Lanka trip.</p>",
            theme="green",
        ),
    )


def notify_tour_assigned(tour: TourPlan, user: User | None, driver: Driver) -> None:
    """
    Sent once a driver claims a tour request (Booking.driver_id set) — tells
    the customer who their driver is, and confirms the assignment to the
    driver. Each recipient's email failing must not affect the other.

    Also logs an in-app Notification for both sides — previously this only
    sent email, so the driver whose price was actually accepted had no way
    to see it on their dashboard bell, only the losing drivers did (via
    notify_driver_offer_not_selected, which logs both in-app and email).
    """
    if user and user.email:
        send_email(
            user.email,
            f"Driver Assigned — Tour #{tour.id}",
            _wrap_html(
                "Driver Assigned",
                f"<p>Hi {user.full_name},</p>"
                f"<p>{driver.full_name} has accepted your tour request #{tour.id} "
                "and will be in touch shortly.</p>",
                theme="blue",
            ),
        )
        notify_user_email(
            user.email,
            f"Driver Assigned — Tour #{tour.id}",
            f"{driver.full_name} has accepted your tour request #{tour.id} and will be in touch shortly.",
            tour.id,
        )

    driver_email = _driver_recipient_email(driver)
    if driver_email:
        send_email(
            driver_email,
            f"Tour Assignment Confirmed — #{tour.id}",
            _wrap_html(
                "Tour Assigned to You",
                f"<p>Hi {driver.full_name},</p>"
                f"<p>You're now assigned to tour #{tour.id}. Check your dashboard "
                "for pickup details.</p>",
                theme="blue",
            ),
        )
    notify_driver(
        driver,
        "Your Price Was Accepted",
        f"Your offer was accepted for tour #{tour.id}. Check your dashboard for pickup details.",
        tour.id,
    )


def notify_driver_offer_not_selected(tour: TourPlan, driver: Driver) -> None:
    """Sent to every driver whose offer got auto-superseded once the
    traveler picks a different driver's offer on the same tour."""
    notify_driver(
        driver,
        "Offer Not Selected",
        f"Another driver was selected for tour #{tour.id}. Keep an eye out for new requests.",
        tour.id,
    )
    email = _driver_recipient_email(driver)
    if email:
        send_email(
            email,
            f"Offer Not Selected — Tour #{tour.id}",
            _wrap_html(
                "Offer Not Selected",
                f"<p>Hi {driver.full_name},</p>"
                f"<p>The traveler chose another driver for tour #{tour.id}.</p>",
                theme="red",
                badge="NOT SELECTED",
            ),
        )


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
