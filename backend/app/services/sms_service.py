import os
from twilio.rest import Client
import logging

def send_sms_notification(to_phone, message):
    """
    Sends an SMS notification to the given phone number using Twilio.
    Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set in .env
    """
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
    from_phone = os.environ.get('TWILIO_PHONE_NUMBER')

    if not account_sid or not auth_token or not from_phone:
        logging.warning("Twilio credentials not fully configured in .env. Skipping SMS.")
        return False

    if not to_phone:
        return False

    try:
        # Ensure proper E.164 formatting (assuming Sri Lanka +94 if missing)
        formatted_phone = str(to_phone).strip()
        if not formatted_phone.startswith('+'):
            if formatted_phone.startswith('0'):
                formatted_phone = '+94' + formatted_phone[1:]
            elif len(formatted_phone) == 9: # 771234567
                formatted_phone = '+94' + formatted_phone
            else:
                formatted_phone = '+' + formatted_phone

        client = Client(account_sid, auth_token)
        msg = client.messages.create(
            body=message,
            from_=from_phone,
            to=formatted_phone
        )
        logging.info(f"SMS successfully sent to {formatted_phone}. SID: {msg.sid}")
        return True
    except Exception as e:
        logging.error(f"Failed to send SMS to {to_phone}: {str(e)}")
        return False
