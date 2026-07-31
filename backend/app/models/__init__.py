"""
Model package — split from the original single app/models.py into one file
per logical entity. This file re-exports every class so existing code
throughout the app (`from app.models import User, Driver, ...`) keeps working
unchanged, regardless of which submodule a class actually lives in.
"""

from .user import User, Guest
from .driver import Driver
from .vehicle import Vehicle
from .tour import TourPlan, Location
from .booking import Booking
from .tour_offer import TourOffer
from .notification import Notification
from .feedback import Feedback
from .finance import (
    PlatformSetting,
    CustomerPayment,
    DriverPayment,
    Expense,
    Refund,
    FinancialTransaction,
)

__all__ = [
    "User",
    "Guest",
    "Driver",
    "Vehicle",
    "TourPlan",
    "Location",
    "Booking",
    "TourOffer",
    "Notification",
    "Feedback",
    "PlatformSetting",
    "CustomerPayment",
    "DriverPayment",
    "Expense",
    "Refund",
    "FinancialTransaction",
]
