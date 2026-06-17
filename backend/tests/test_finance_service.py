"""Finance service unit tests."""

import pytest

from app import create_app, db
from app.services.finance_service import (
    calculate_financial_breakdown,
    get_platform_settings,
)


@pytest.fixture
def app():
    app = create_app()
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["TESTING"] = True
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def test_platform_settings_defaults(app):
    with app.app_context():
        settings = get_platform_settings()
        assert settings.customer_service_fee_percent == 10.0
        assert settings.driver_service_fee_percent == 5.0


def test_financial_breakdown(app):
    with app.app_context():
        get_platform_settings()
        result = calculate_financial_breakdown(10000)
        assert result["final_agreed_price"] == 10000
        assert result["customer_service_fee"] == 1000
        assert result["driver_service_fee"] == 500
        assert result["total_customer_payment"] == 11000
        assert result["driver_payout"] == 9500
        assert result["platform_revenue"] == 1500


def test_rejects_negative_price(app):
    with app.app_context():
        get_platform_settings()
        with pytest.raises(ValueError):
            calculate_financial_breakdown(-100)
