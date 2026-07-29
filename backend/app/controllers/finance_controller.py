import csv
import io
import os
import uuid
from datetime import datetime

from flask import Blueprint, jsonify, request, send_from_directory

from app import db
from app.decorators import admin_required
from app.models import (
    Booking,
    CustomerPayment,
    DriverPayment,
    Expense,
    Refund,
    TourPlan,
    User,
    Vehicle,
)
from app.services.finance_service import (
    CUSTOMER_PAYMENT_STATUSES,
    DRIVER_PAYMENT_STATUSES,
    EXPENSE_CATEGORIES,
    REFUND_STATUSES,
    backfill_financial_records,
    calculate_financial_breakdown,
    enrich_customer_payment,
    enrich_driver_payment,
    generate_financial_report,
    get_finance_dashboard,
    get_income_summary,
    get_platform_settings,
    paginate_query,
    record_transaction,
    seed_vehicle_pricing,
    serialize_vehicle_pricing,
    sync_income_transactions_for_booking,
    upsert_payment_records_for_booking,
    _positive_amount,
)

finance_bp = Blueprint("finance_bp", __name__, url_prefix="/admin/finance")

UPLOAD_FOLDER = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "expenses")
)
ALLOWED_RECEIPT_EXT = {"png", "jpg", "jpeg", "gif", "webp", "pdf"}


def _save_receipt(file_obj):
    if not file_obj or not file_obj.filename:
        return None
    ext = file_obj.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_RECEIPT_EXT:
        raise ValueError("Invalid receipt file type")
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_obj.save(os.path.join(UPLOAD_FOLDER, filename))
    return filename


@finance_bp.route("/uploads/expenses/<filename>")
@admin_required
def serve_expense_receipt(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# =========================
# DASHBOARD
# =========================
@finance_bp.route("/dashboard", methods=["GET"])
@admin_required
def finance_dashboard():
    return jsonify(get_finance_dashboard()), 200


# =========================
# PRICING (vehicle table = pricing_settings)
# =========================
@finance_bp.route("/pricing", methods=["GET"])
@admin_required
def list_pricing():
    vehicles = Vehicle.query.order_by(Vehicle.id).all()
    return jsonify([serialize_vehicle_pricing(v) for v in vehicles]), 200


@finance_bp.route("/pricing/<int:vehicle_id>", methods=["PUT"])
@admin_required
def update_pricing(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"message": "Pricing record not found"}), 404

    data = request.get_json() or {}
    if "base_fare" in data:
        vehicle.base_fare = _positive_amount(data["base_fare"], "base_fare")
    if "price_per_km" in data:
        vehicle.price_per_km = _positive_amount(data["price_per_km"], "price_per_km")
    if "price_per_day" in data:
        vehicle.price_per_day = _positive_amount(data["price_per_day"], "price_per_day")
    if "max_passengers" in data:
        pax = int(data["max_passengers"])
        if pax <= 0:
            return jsonify({"message": "max_passengers must be positive"}), 400
        vehicle.max_passengers = pax
    if "is_active" in data:
        vehicle.is_active = bool(data["is_active"])

    db.session.commit()
    return jsonify(serialize_vehicle_pricing(vehicle)), 200


@finance_bp.route("/pricing/seed", methods=["POST"])
@admin_required
def seed_pricing():
    count = seed_vehicle_pricing()
    return jsonify({"message": f"Pricing updated for {count} vehicle types"}), 200


# =========================
# PLATFORM SETTINGS
# =========================
@finance_bp.route("/platform-settings", methods=["GET"])
@admin_required
def get_settings():
    s = get_platform_settings()
    return jsonify({
        "customer_service_fee_percent": s.customer_service_fee_percent,
        "driver_service_fee_percent": s.driver_service_fee_percent,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }), 200


@finance_bp.route("/platform-settings", methods=["PUT"])
@admin_required
def update_settings():
    data = request.get_json() or {}
    s = get_platform_settings()

    if "customer_service_fee_percent" in data:
        val = _positive_amount(data["customer_service_fee_percent"], "customer_service_fee_percent")
        if val > 100:
            return jsonify({"message": "Customer fee cannot exceed 100%"}), 400
        s.customer_service_fee_percent = val
    if "driver_service_fee_percent" in data:
        val = _positive_amount(data["driver_service_fee_percent"], "driver_service_fee_percent")
        if val > 100:
            return jsonify({"message": "Driver fee cannot exceed 100%"}), 400
        s.driver_service_fee_percent = val

    db.session.commit()
    return jsonify({"message": "Platform settings updated"}), 200


@finance_bp.route("/calculate-breakdown", methods=["POST"])
@admin_required
def preview_breakdown():
    data = request.get_json() or {}
    price = data.get("final_agreed_price")
    if price is None:
        return jsonify({"message": "final_agreed_price is required"}), 400
    try:
        return jsonify(calculate_financial_breakdown(price)), 200
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400


# =========================
# CUSTOMER PAYMENTS
# =========================
@finance_bp.route("/customer-payments", methods=["GET"])
@admin_required
def list_customer_payments():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    status = request.args.get("status", "").strip()
    search = request.args.get("search", "").strip().lower()

    query = CustomerPayment.query.order_by(CustomerPayment.created_at.desc())
    if status:
        query = query.filter(CustomerPayment.status == status)

    items, total, page, per_page = paginate_query(query, page, per_page)
    rows = [enrich_customer_payment(p) for p in items]

    if search:
        rows = [
            r for r in rows
            if search in str(r.get("booking_id", "")).lower()
            or search in (r.get("customer_name") or "").lower()
            or search in (r.get("customer_email") or "").lower()
            or search in str(r.get("tour_id", "")).lower()
        ]

    return jsonify({
        "items": rows,
        "total": total,
        "page": page,
        "per_page": per_page,
        "statuses": sorted(CUSTOMER_PAYMENT_STATUSES),
    }), 200


@finance_bp.route("/customer-payments/<int:payment_id>", methods=["PUT"])
@admin_required
def update_customer_payment(payment_id):
    payment = CustomerPayment.query.get(payment_id)
    if not payment:
        return jsonify({"message": "Payment not found"}), 404

    data = request.get_json() or {}
    if "status" in data:
        if data["status"] not in CUSTOMER_PAYMENT_STATUSES:
            return jsonify({"message": "Invalid status"}), 400
        payment.status = data["status"]
    if "payment_method" in data:
        payment.payment_method = str(data["payment_method"])[:50]
    if "payment_date" in data and data["payment_date"]:
        payment.payment_date = datetime.fromisoformat(data["payment_date"].replace("Z", ""))

    if payment.status == "paid":
        booking = Booking.query.get(payment.booking_id)
        if booking:
            booking.payment_status = "paid"
            sync_income_transactions_for_booking(booking)

    db.session.commit()
    return jsonify(enrich_customer_payment(payment)), 200


# =========================
# DRIVER PAYMENTS
# =========================
@finance_bp.route("/driver-payments", methods=["GET"])
@admin_required
def list_driver_payments():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    status = request.args.get("status", "").strip()

    query = DriverPayment.query.order_by(DriverPayment.created_at.desc())
    if status:
        query = query.filter(DriverPayment.status == status)

    items, total, page, per_page = paginate_query(query, page, per_page)
    return jsonify({
        "items": [enrich_driver_payment(p) for p in items],
        "total": total,
        "page": page,
        "per_page": per_page,
        "statuses": sorted(DRIVER_PAYMENT_STATUSES),
    }), 200


@finance_bp.route("/driver-payments/<int:payment_id>", methods=["PUT"])
@admin_required
def update_driver_payment(payment_id):
    payment = DriverPayment.query.get(payment_id)
    if not payment:
        return jsonify({"message": "Driver payment not found"}), 404

    data = request.get_json() or {}
    if "status" in data:
        if data["status"] not in DRIVER_PAYMENT_STATUSES:
            return jsonify({"message": "Invalid status"}), 400
        payment.status = data["status"]
    if "payment_date" in data and data["payment_date"]:
        payment.payment_date = datetime.fromisoformat(data["payment_date"].replace("Z", ""))

    db.session.commit()
    return jsonify(enrich_driver_payment(payment)), 200


# =========================
# INCOME
# =========================
@finance_bp.route("/income/summary", methods=["GET"])
@admin_required
def income_summary():
    period = request.args.get("period", "monthly")
    return jsonify(get_income_summary(period)), 200


# =========================
# EXPENSES
# =========================
@finance_bp.route("/expenses", methods=["GET"])
@admin_required
def list_expenses():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    category = request.args.get("category", "").strip()

    query = Expense.query.order_by(Expense.expense_date.desc())
    if category:
        query = query.filter(Expense.category == category)

    items, total, page, per_page = paginate_query(query, page, per_page)
    return jsonify({
        "items": [
            {
                "id": e.id,
                "name": e.name,
                "category": e.category,
                "amount": e.amount,
                "description": e.description,
                "expense_date": e.expense_date.isoformat() if e.expense_date else None,
                "receipt_filename": e.receipt_filename,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in items
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "categories": sorted(EXPENSE_CATEGORIES),
    }), 200


@finance_bp.route("/expenses", methods=["POST"])
@admin_required
def create_expense():
    data = request.form.to_dict() if request.form else (request.get_json() or {})
    name = (data.get("name") or "").strip()
    category = (data.get("category") or "").strip()
    if not name or not category:
        return jsonify({"message": "name and category are required"}), 400
    if category not in EXPENSE_CATEGORIES:
        return jsonify({"message": "Invalid expense category"}), 400

    amount = _positive_amount(data.get("amount"), "amount")
    if amount <= 0:
        return jsonify({"message": "amount must be greater than 0"}), 400

    expense_date_raw = data.get("expense_date")
    expense_date = datetime.strptime(expense_date_raw, "%Y-%m-%d").date() if expense_date_raw else datetime.utcnow().date()

    receipt = None
    if "receipt" in request.files:
        receipt = _save_receipt(request.files["receipt"])

    expense = Expense(
        name=name,
        category=category,
        amount=amount,
        description=data.get("description"),
        expense_date=expense_date,
        receipt_filename=receipt,
    )
    db.session.add(expense)
    record_transaction(
        transaction_type="expense",
        category=category,
        amount=amount,
        reference_type="expense",
        reference_id=None,
        description=f"Expense: {name}",
        transaction_date=datetime.combine(expense_date, datetime.min.time()),
    )
    db.session.commit()
    return jsonify({"message": "Expense created", "id": expense.id}), 201


@finance_bp.route("/expenses/<int:expense_id>", methods=["PUT"])
@admin_required
def update_expense(expense_id):
    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"message": "Expense not found"}), 404

    data = request.form.to_dict() if request.form else (request.get_json() or {})
    if "name" in data:
        expense.name = str(data["name"]).strip()
    if "category" in data:
        cat = str(data["category"]).strip()
        if cat not in EXPENSE_CATEGORIES:
            return jsonify({"message": "Invalid category"}), 400
        expense.category = cat
    if "amount" in data:
        expense.amount = _positive_amount(data["amount"], "amount")
    if "description" in data:
        expense.description = data.get("description")
    if "expense_date" in data and data["expense_date"]:
        expense.expense_date = datetime.strptime(data["expense_date"], "%Y-%m-%d").date()
    if "receipt" in request.files:
        expense.receipt_filename = _save_receipt(request.files["receipt"])

    db.session.commit()
    return jsonify({"message": "Expense updated"}), 200


@finance_bp.route("/expenses/<int:expense_id>", methods=["DELETE"])
@admin_required
def delete_expense(expense_id):
    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"message": "Expense not found"}), 404
    db.session.delete(expense)
    db.session.commit()
    return jsonify({"message": "Expense deleted"}), 200


# =========================
# REFUNDS
# =========================
@finance_bp.route("/refunds", methods=["GET"])
@admin_required
def list_refunds():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    status = request.args.get("status", "").strip()

    query = Refund.query.order_by(Refund.requested_date.desc())
    if status:
        query = query.filter(Refund.status == status)

    items, total, page, per_page = paginate_query(query, page, per_page)
    rows = []
    for r in items:
        user = User.query.get(r.user_id) if r.user_id else None
        rows.append({
            "id": r.id,
            "booking_id": r.booking_id,
            "tour_id": r.tour_id,
            "customer_name": user.full_name if user else "Guest",
            "refund_amount": r.refund_amount,
            "reason": r.reason,
            "requested_date": r.requested_date.isoformat() if r.requested_date else None,
            "processed_date": r.processed_date.isoformat() if r.processed_date else None,
            "status": r.status,
        })

    return jsonify({
        "items": rows,
        "total": total,
        "page": page,
        "per_page": per_page,
        "statuses": sorted(REFUND_STATUSES),
    }), 200


@finance_bp.route("/refunds", methods=["POST"])
@admin_required
def create_refund():
    data = request.get_json() or {}
    booking_id = data.get("booking_id")
    if not booking_id:
        return jsonify({"message": "booking_id is required"}), 400

    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({"message": "Booking not found"}), 404

    tour = TourPlan.query.get(booking.tour_id)
    amount = _positive_amount(data.get("refund_amount"), "refund_amount")
    reason = (data.get("reason") or "").strip()
    if not reason:
        return jsonify({"message": "reason is required"}), 400

    refund = Refund(
        booking_id=booking.id,
        tour_id=booking.tour_id,
        user_id=tour.user_id if tour else None,
        refund_amount=amount,
        reason=reason,
        status="pending",
    )
    db.session.add(refund)
    db.session.commit()
    return jsonify({"message": "Refund request created", "id": refund.id}), 201


@finance_bp.route("/refunds/<int:refund_id>", methods=["PUT"])
@admin_required
def update_refund(refund_id):
    refund = Refund.query.get(refund_id)
    if not refund:
        return jsonify({"message": "Refund not found"}), 404

    data = request.get_json() or {}
    if "status" in data:
        if data["status"] not in REFUND_STATUSES:
            return jsonify({"message": "Invalid status"}), 400
        refund.status = data["status"]
        if data["status"] in ("approved", "completed"):
            refund.processed_date = datetime.utcnow()
            customer = CustomerPayment.query.filter_by(booking_id=refund.booking_id).first()
            if customer:
                customer.status = "refunded"
            record_transaction(
                transaction_type="refund",
                category="refund",
                amount=refund.refund_amount,
                reference_type="refund",
                reference_id=refund.id,
                description=refund.reason,
            )

    db.session.commit()
    return jsonify({"message": "Refund updated"}), 200


# =========================
# REPORTS
# =========================
@finance_bp.route("/reports", methods=["GET"])
@admin_required
def financial_report():
    report_type = request.args.get("type", "revenue")
    period = request.args.get("period", "monthly")
    date_from = request.args.get("from")
    date_to = request.args.get("to")
    try:
        report = generate_financial_report(report_type, period, date_from, date_to)
        return jsonify(report), 200
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400


@finance_bp.route("/reports/export", methods=["GET"])
@admin_required
def export_report():
    report_type = request.args.get("type", "revenue")
    period = request.args.get("period", "monthly")
    fmt = request.args.get("format", "csv")
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    try:
        report = generate_financial_report(report_type, period, date_from, date_to)
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400

    rows = report.get("rows", [])
    if not rows and report_type == "profit_loss":
        rows = [{
            "revenue": report.get("revenue"),
            "expenses": report.get("expenses"),
            "net_profit": report.get("net_profit"),
        }]
    elif not rows and report_type == "platform_fees":
        rows = [{
            "customer_service_fees": report.get("customer_service_fees"),
            "driver_service_fees": report.get("driver_service_fees"),
            "total_platform_fees": report.get("total_platform_fees"),
        }]

    if fmt == "csv":
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        else:
            output.write("No data\n")
        return (
            output.getvalue(),
            200,
            {
                "Content-Type": "text/csv",
                "Content-Disposition": f'attachment; filename="{report_type}_{period}.csv"',
            },
        )

    return jsonify({"message": "Supported export formats: csv", "report": report}), 200


# =========================
# SYNC / MAINTENANCE
# =========================
@finance_bp.route("/sync-bookings", methods=["POST"])
@admin_required
def sync_bookings():
    result = backfill_financial_records()
    return jsonify(result), 200
