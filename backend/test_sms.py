import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
from_phone = os.environ.get('TWILIO_PHONE_NUMBER')
to_phone = '+94743095661'

print(f"SID: {account_sid}")
print(f"Token: {auth_token[:5]}...")
print(f"From: {from_phone}")

try:
    client = Client(account_sid, auth_token)
    message = client.messages.create(
        body="Test message from Smart Tour",
        from_=from_phone,
        to=to_phone
    )
    print(f"Success! SID: {message.sid}")
except Exception as e:
    print(f"Error: {e}")
