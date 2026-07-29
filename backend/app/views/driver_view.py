"""
Response-shaping ("View" layer) for driver-related data returned to clients.
Kept separate from app/controllers so the same presentation logic can be
reused wherever this exact shape is needed, without duplicating it inline.
"""


def driver_public_summary(driver):
    """
    The compact, public-facing driver info shown to a tour's customer
    (name, contact, vehicle) — deliberately excludes private fields like
    NIC, license number, or home address.
    """
    if not driver:
        return None
    return {
        "id": driver.id,
        "name": driver.full_name,
        "phone": driver.phone,
        "profile_photo": driver.profile_photo,
        "vehicle_brand": driver.vehicle_brand,
        "vehicle_number": driver.vehicle_number,
        "vehicle_color": driver.vehicle_color,
        "vehicle_type": driver.vehicle_type,
        "capacity": driver.capacity,
        "vehicle_front_image": driver.vehicle_front_image,
    }
