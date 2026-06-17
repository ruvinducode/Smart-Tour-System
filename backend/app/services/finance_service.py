"""
Finance calculations, ledger, and reporting — single source of truth.

Vehicle pricing is stored in the `vehicle` table (pricing_settings).
Platform fees are stored in `platform_settings`.
"""

from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import extract, func

from app import db
from app.models import (
    Booking,
    CustomerPayment,
    Driver,
    DriverPayment,
    Expense,
    FinancialTransaction,
    PlatformSetting,
    Refund,
    TourPlan,
    User,
    Vehicle,
)

CUSTOMER_PAYMENT_STATUSES = {"pending", "partially_paid", "paid", "failed", "refunded"}
DRIVER_PAYMENT_STATUSES = {"pending", "processing", "paid", "cancelled"}
REFUND_STATUSES = {"pending", "approved", "rejected", "completed"}
EXPENSE_CATEGORIES = {
    "fuel",
    "maintenance",
    "vehicle_repairs",
    "marketing",
    "salaries",
    "office_expenses",
    "software_subscriptions",
    "other",
}
INCOME_CATEGORIES = {
    "booking_revenue",
    "customer_service_fees",
    "driver_service_fees",
    "other_income",
}

VEHICLE_PRICING_SEEDS = [
    ("Mini car", 2000, 60, 5000, 3),
    ("Car", 2500, 70, 6000, 4),
    ("Mini van", 3000, 80, 7500, 6),
    ("SUV", 3500, 90, 8500, 5),
    ("Van", 4000, 95, 10000, 8),
    ("Mini bus", 5000, 110, 13000, 15),
    ("Bus", 6000, 130, 16000, 30),
]


def _now() -> datetime:
    return datetime.utcnow()


def _positive_amount(value: Any, field_name: str = "amount") -> float:
    try:
        num = round(float(value), 2)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a number") from exc
    if num < 0:
        raise ValueError(f"{field_name} cannot be negative")
    return num


def get_platform_settings() -> PlatformSetting:
    settings = PlatformSetting.query.first()
    if not settings:
        settings = PlatformSetting(
            customer_service_fee_percent=10.0,
            driver_service_fee_percent=5.0,
        )
        db.session.add(settings)
        db.session.commit()
    return settings


def calculate_financial_breakdown(final_agreed_price: float) -> dict:
    """Compute fees from final agreed price (post-negotiation)."""
    settings = get_platform_settings()
    final = _positive_amount(final_agreed_price, "final_agreed_price")
    if final <= 0:
        raise ValueError("final_agreed_price must be greater than 0")

    customer_pct = (settings.customer_service_fee_percent or 0) / 100.0
    driver_pct = (settings.driver_service_fee_percent or 0) / 100.0

    customer_service_fee = round(final * customer_pct, 2)
    driver_service_fee = round(final * driver_pct, 2)
    total_customer_payment = round(final + customer_service_fee, 2)
    driver_payout = round(final - driver_service_fee, 2)
    platform_revenue = round(customer_service_fee + driver_service_fee, 2)

    return {
        "final_agreed_price": final,
        "customer_service_fee_percent": settings.customer_service_fee_percent,
        "driver_service_fee_percent": settings.driver_service_fee_percent,
        "customer_service_fee": customer_service_fee,
        "driver_service_fee": driver_service_fee,
        "total_customer_payment": total_customer_payment,
        "driver_payout": driver_payout,
        "platform_revenue": platform_revenue,
    }


def record_transaction(
    transaction_type: str,
    category: str,
    amount: float,
    reference_type: str | None = None,
    reference_id: int | None = None,
    description: str | None = None,
    transaction_date: datetime | None = None,
) -> FinancialTransaction:
    amt = _positive_amount(amount, "transaction amount")
    if amt == 0:
        raise ValueError("transaction amount must be greater than 0")

    tx = FinancialTransaction(
        transaction_type=transaction_type,
        category=category,
        amount=amt,
        reference_type=reference_type,
        reference_id=reference_id,
        description=description,
        transaction_date=transaction_date or _now(),
    )
    db.session.add(tx)
    return tx


def upsert_payment_records_for_booking(booking: Booking, final_agreed_price: float | None = None) -> dict:
    """Create or refresh customer/driver payment rows from booking final price."""
    if not booking:
        raise ValueError("booking is required")

    tour = TourPlan.query.get(booking.tour_id)
    if not tour:
        raise ValueError("tour not found for booking")

    price = final_agreed_price if final_agreed_price is not None else booking.total_price
    if price is None or float(price) <= 0:
        return {"skipped": True, "reason": "no final agreed price"}

    breakdown = calculate_financial_breakdown(float(price))

    customer = CustomerPayment.query.filter_by(booking_id=booking.id).first()
    if not customer:
        customer = CustomerPayment(
            booking_id=booking.id,
            tour_id=booking.tour_id,
            user_id=tour.user_id,
            status="pending",
        )
        db.session.add(customer)

    customer.final_agreed_price = breakdown["final_agreed_price"]
    customer.customer_service_fee = breakdown["customer_service_fee"]
    customer.total_customer_payment = breakdown["total_customer_payment"]

    driver_payment = DriverPayment.query.filter_by(booking_id=booking.id).first()
    if not driver_payment:
        if not booking.driver_id:
            db.session.flush()
            return {"customer_payment_id": customer.id, "driver_payment_id": None}
        driver_payment = DriverPayment(
            booking_id=booking.id,
            tour_id=booking.tour_id,
            driver_id=booking.driver_id,
            status="pending",
        )
        db.session.add(driver_payment)

    driver_payment.final_agreed_price = breakdown["final_agreed_price"]
    driver_payment.driver_service_fee = breakdown["driver_service_fee"]
    driver_payment.driver_payout = breakdown["driver_payout"]

    db.session.flush()
    return {
        "customer_payment_id": customer.id,
        "driver_payment_id": driver_payment.id if driver_payment else None,
        "breakdown": breakdown,
    }


def sync_income_transactions_for_booking(booking: Booking) -> None:
    """Record platform income ledger entries when tour is financially confirmed."""
    customer = CustomerPayment.query.filter_by(booking_id=booking.id).first()
    if not customer:
        return

    existing = FinancialTransaction.query.filter_by(
        reference_type="booking",
        reference_id=booking.id,
        category="customer_service_fees",
    ).first()
    if existing:
        return

    record_transaction(
        transaction_type="income",
        category="booking_revenue",
        amount=customer.final_agreed_price,
        reference_type="booking",
        reference_id=booking.id,
        description=f"Booking #{booking.id} tour revenue",
    )
    record_transaction(
        transaction_type="income",
        category="customer_service_fees",
        amount=customer.customer_service_fee,
        reference_type="booking",
        reference_id=booking.id,
        description=f"Customer service fee — booking #{booking.id}",
    )

    driver_payment = DriverPayment.query.filter_by(booking_id=booking.id).first()
    if driver_payment:
        record_transaction(
            transaction_type="income",
            category="driver_service_fees",
            amount=driver_payment.driver_service_fee,
            reference_type="booking",
            reference_id=booking.id,
            description=f"Driver service fee — booking #{booking.id}",
        )


def serialize_vehicle_pricing(vehicle: Vehicle) -> dict:
    return {
        "id": vehicle.id,
        "vehicle_type": vehicle.type,
        "base_fare": vehicle.base_fare,
        "price_per_km": vehicle.price_per_km,
        "price_per_day": vehicle.price_per_day,
        "max_passengers": vehicle.max_passengers,
        "is_active": vehicle.is_active,
        "created_at": vehicle.created_at.isoformat() if vehicle.created_at else None,
        "updated_at": vehicle.updated_at.isoformat() if vehicle.updated_at else None,
    }


def _date_range(period: str, date_from: str | None = None, date_to: str | None = None) -> tuple[datetime, datetime]:
    today = date.today()
    if period == "custom" and date_from and date_to:
        start = datetime.strptime(date_from, "%Y-%m-%d")
        end = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
        return start, end
    if period == "daily":
        start = datetime.combine(today, datetime.min.time())
        return start, start + timedelta(days=1)
    if period == "weekly":
        start = datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time())
        return start, start + timedelta(days=7)
    if period == "yearly":
        start = datetime(today.year, 1, 1)
        return start, datetime(today.year + 1, 1, 1)
    # monthly default
    start = datetime(today.year, today.month, 1)
    if today.month == 12:
        end = datetime(today.year + 1, 1, 1)
    else:
        end = datetime(today.year, today.month + 1, 1)
    return start, end


def _sum_income(start: datetime, end: datetime) -> float:
    total = (
        db.session.query(func.coalesce(func.sum(FinancialTransaction.amount), 0))
        .filter(
            FinancialTransaction.transaction_type == "income",
            FinancialTransaction.transaction_date >= start,
            FinancialTransaction.transaction_date < end,
        )
        .scalar()
    )
    return float(total or 0)


def _sum_expenses(start: datetime, end: datetime) -> float:
    total = (
        db.session.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(Expense.expense_date >= start.date(), Expense.expense_date < end.date())
        .scalar()
    )
    return float(total or 0)


def get_finance_dashboard() -> dict:
    now = _now()
    month_start = datetime(now.year, now.month, 1)
    if now.month == 12:
        month_end = datetime(now.year + 1, 1, 1)
    else:
        month_end = datetime(now.year, now.month + 1, 1)

    total_revenue = _sum_income(datetime(2000, 1, 1), now + timedelta(days=1))
    total_expenses = (
        db.session.query(func.coalesce(func.sum(Expense.amount), 0)).scalar() or 0
    )
    monthly_revenue = _sum_income(month_start, month_end)
    monthly_expenses = _sum_expenses(month_start, month_end)

    pending_customer = (
        db.session.query(func.coalesce(func.sum(CustomerPayment.total_customer_payment), 0))
        .filter(CustomerPayment.status.in_(["pending", "partially_paid"]))
        .scalar() or 0
    )
    pending_driver = (
        db.session.query(func.coalesce(func.sum(DriverPayment.driver_payout), 0))
        .filter(DriverPayment.status.in_(["pending", "processing"]))
        .scalar() or 0
    )
    bookings_revenue = (
        db.session.query(func.coalesce(func.sum(CustomerPayment.final_agreed_price), 0))
        .filter(CustomerPayment.status.in_(["paid", "partially_paid"]))
        .scalar() or 0
    )
    platform_revenue = float(
        db.session.query(func.coalesce(func.sum(CustomerPayment.customer_service_fee), 0)).scalar() or 0
    ) + float(
        db.session.query(func.coalesce(func.sum(DriverPayment.driver_service_fee), 0)).scalar() or 0
    )

    # Monthly trends — last 6 months
    monthly_trend = []
    for i in range(5, -1, -1):
        ref = now.month - i
        year = now.year
        while ref <= 0:
            ref += 12
            year -= 1
        m_start = datetime(year, ref, 1)
        last_day = monthrange(year, ref)[1]
        m_end = datetime(year, ref, last_day) + timedelta(days=1)
        label = m_start.strftime("%b %Y")
        rev = _sum_income(m_start, m_end)
        exp = _sum_expenses(m_start, m_end)
        monthly_trend.append({
            "month": label,
            "revenue": round(rev, 2),
            "expenses": round(exp, 2),
            "profit": round(rev - exp, 2),
        })

    revenue_by_vehicle = (
        db.session.query(
            Vehicle.type,
            func.coalesce(func.sum(CustomerPayment.final_agreed_price), 0).label("revenue"),
        )
        .join(TourPlan, TourPlan.id == CustomerPayment.tour_id)
        .join(Vehicle, Vehicle.id == TourPlan.vehicle_id)
        .group_by(Vehicle.type)
        .all()
    )

    recent = (
        FinancialTransaction.query.order_by(FinancialTransaction.transaction_date.desc())
        .limit(10)
        .all()
    )

    return {
        "kpis": {
            "total_revenue": round(float(total_revenue), 2),
            "total_expenses": round(float(total_expenses), 2),
            "net_profit": round(float(total_revenue) - float(total_expenses), 2),
            "pending_customer_payments": round(float(pending_customer), 2),
            "pending_driver_payouts": round(float(pending_driver), 2),
            "total_bookings_revenue": round(float(bookings_revenue), 2),
            "platform_revenue": round(float(platform_revenue), 2),
            "monthly_revenue": round(float(monthly_revenue), 2),
            "monthly_profit": round(float(monthly_revenue) - float(monthly_expenses), 2),
        },
        "charts": {
            "monthly_trend": monthly_trend,
            "revenue_by_vehicle_type": [
                {"vehicle_type": row[0], "revenue": round(float(row[1]), 2)}
                for row in revenue_by_vehicle
            ],
        },
        "recent_transactions": [
            {
                "id": tx.id,
                "transaction_type": tx.transaction_type,
                "category": tx.category,
                "amount": tx.amount,
                "description": tx.description,
                "transaction_date": tx.transaction_date.isoformat() if tx.transaction_date else None,
            }
            for tx in recent
        ],
    }


def paginate_query(query, page: int, per_page: int):
    page = max(1, page)
    per_page = min(max(1, per_page), 100)
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return items, total, page, per_page


def enrich_customer_payment(payment: CustomerPayment) -> dict:
    tour = TourPlan.query.get(payment.tour_id)
    user = User.query.get(payment.user_id) if payment.user_id else None
    return {
        "id": payment.id,
        "booking_id": payment.booking_id,
        "tour_id": payment.tour_id,
        "customer_name": user.full_name if user else "Guest",
        "customer_email": user.email if user else None,
        "tour_status": tour.status if tour else None,
        "final_agreed_price": payment.final_agreed_price,
        "customer_service_fee": payment.customer_service_fee,
        "total_customer_payment": payment.total_customer_payment,
        "payment_method": payment.payment_method,
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "status": payment.status,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
    }


def enrich_driver_payment(payment: DriverPayment) -> dict:
    driver = Driver.query.get(payment.driver_id)
    tour = TourPlan.query.get(payment.tour_id)
    return {
        "id": payment.id,
        "booking_id": payment.booking_id,
        "tour_id": payment.tour_id,
        "driver_name": driver.full_name if driver else "—",
        "driver_email": driver.email if driver else None,
        "tour_status": tour.status if tour else None,
        "final_agreed_price": payment.final_agreed_price,
        "driver_service_fee": payment.driver_service_fee,
        "driver_payout": payment.driver_payout,
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "status": payment.status,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
    }


def get_income_summary(period: str) -> dict:
    start, end = _date_range(period)
    rows = (
        db.session.query(
            FinancialTransaction.category,
            func.coalesce(func.sum(FinancialTransaction.amount), 0),
        )
        .filter(
            FinancialTransaction.transaction_type == "income",
            FinancialTransaction.transaction_date >= start,
            FinancialTransaction.transaction_date < end,
        )
        .group_by(FinancialTransaction.category)
        .all()
    )
    breakdown = {cat: 0.0 for cat in INCOME_CATEGORIES}
    for category, amount in rows:
        breakdown[category] = round(float(amount), 2)
    total = round(sum(breakdown.values()), 2)
    return {"period": period, "start": start.isoformat(), "end": end.isoformat(), "breakdown": breakdown, "total": total}


def generate_financial_report(report_type: str, period: str, date_from: str | None = None, date_to: str | None = None) -> dict:
    start, end = _date_range(period, date_from, date_to)

    if report_type == "revenue":
        rows = (
            FinancialTransaction.query.filter(
                FinancialTransaction.transaction_type == "income",
                FinancialTransaction.transaction_date >= start,
                FinancialTransaction.transaction_date < end,
            )
            .order_by(FinancialTransaction.transaction_date.desc())
            .all()
        )
        return {
            "report_type": report_type,
            "period": period,
            "rows": [
                {
                    "date": r.transaction_date.isoformat(),
                    "category": r.category,
                    "amount": r.amount,
                    "description": r.description,
                }
                for r in rows
            ],
            "total": round(sum(r.amount for r in rows), 2),
        }

    if report_type == "expense":
        rows = (
            Expense.query.filter(
                Expense.expense_date >= start.date(),
                Expense.expense_date < end.date(),
            )
            .order_by(Expense.expense_date.desc())
            .all()
        )
        return {
            "report_type": report_type,
            "period": period,
            "rows": [
                {
                    "date": r.expense_date.isoformat() if r.expense_date else None,
                    "category": r.category,
                    "name": r.name,
                    "amount": r.amount,
                    "description": r.description,
                }
                for r in rows
            ],
            "total": round(sum(r.amount for r in rows), 2),
        }

    if report_type == "profit_loss":
        revenue = _sum_income(start, end)
        expenses = _sum_expenses(start, end)
        return {
            "report_type": report_type,
            "period": period,
            "revenue": round(revenue, 2),
            "expenses": round(expenses, 2),
            "net_profit": round(revenue - expenses, 2),
        }

    if report_type == "platform_fees":
        customer_fees = (
            db.session.query(func.coalesce(func.sum(CustomerPayment.customer_service_fee), 0))
            .filter(CustomerPayment.created_at >= start, CustomerPayment.created_at < end)
            .scalar() or 0
        )
        driver_fees = (
            db.session.query(func.coalesce(func.sum(DriverPayment.driver_service_fee), 0))
            .filter(DriverPayment.created_at >= start, DriverPayment.created_at < end)
            .scalar() or 0
        )
        return {
            "report_type": report_type,
            "period": period,
            "customer_service_fees": round(float(customer_fees), 2),
            "driver_service_fees": round(float(driver_fees), 2),
            "total_platform_fees": round(float(customer_fees) + float(driver_fees), 2),
        }

    if report_type == "driver_payouts":
        rows = (
            DriverPayment.query.filter(
                DriverPayment.created_at >= start,
                DriverPayment.created_at < end,
            )
            .order_by(DriverPayment.created_at.desc())
            .all()
        )
        return {
            "report_type": report_type,
            "period": period,
            "rows": [enrich_driver_payment(r) for r in rows],
            "total": round(sum(r.driver_payout for r in rows), 2),
        }

    raise ValueError(f"Unknown report type: {report_type}")


def seed_vehicle_pricing() -> int:
    updated = 0
    for type_name, base_fare, price_per_km, price_per_day, max_passengers in VEHICLE_PRICING_SEEDS:
        vehicle = Vehicle.query.filter_by(type=type_name).first()
        if vehicle:
            vehicle.base_fare = base_fare
            vehicle.price_per_km = price_per_km
            vehicle.price_per_day = price_per_day
            vehicle.max_passengers = max_passengers
            vehicle.is_active = True
            updated += 1
        else:
            db.session.add(
                Vehicle(
                    type=type_name,
                    base_fare=base_fare,
                    price_per_km=price_per_km,
                    price_per_day=price_per_day,
                    max_passengers=max_passengers,
                    is_active=True,
                )
            )
            updated += 1
    get_platform_settings()
    db.session.commit()
    return updated


def backfill_financial_records() -> dict:
    """Sync payment records for confirmed/completed bookings."""
    bookings = Booking.query.filter(
        Booking.total_price.isnot(None),
        Booking.total_price > 0,
        Booking.status.in_(["confirmed", "driver_approved", "en_route", "arrived", "ongoing", "completed"]),
    ).all()
    created = 0
    for booking in bookings:
        result = upsert_payment_records_for_booking(booking)
        if not result.get("skipped"):
            created += 1
        if booking.status == "completed":
            sync_income_transactions_for_booking(booking)
    db.session.commit()
    return {"processed": len(bookings), "upserted": created}
