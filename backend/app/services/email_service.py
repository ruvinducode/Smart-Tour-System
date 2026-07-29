import os
import logging

import requests

RESEND_API_URL = "https://api.resend.com/emails"
LOGO_URL = "https://airbnctours.com/images/logo.jpeg"

# Color themes: green = registrations, blue = approvals, red = rejections,
# neutral = everything else (tour assignments, new-tour alerts).
_THEMES = {
    "green": {"accent": "#16a34a", "soft": "#ecfdf5", "label": "REGISTRATION"},
    "blue": {"accent": "#2563eb", "soft": "#eff6ff", "label": "APPROVED"},
    "red": {"accent": "#dc2626", "soft": "#fef2f2", "label": "UPDATE"},
    "neutral": {"accent": "#0f2d24", "soft": "#f5f7f6", "label": "NOTIFICATION"},
}


def _wrap_html(heading, body_html, theme="neutral", badge=None):
    """Elegant, branded shell used by every transactional email — logo at
    the top, a colored accent band per event type (registration/approval/
    rejection), consistent footer.

    Built as a full HTML document with a real <table> layout (not divs) and
    a color-scheme lock, because Gmail/Apple Mail dark mode otherwise
    auto-inverts dark headings and card backgrounds, and div/flex-based
    centering collapses in stripped-down email CSS engines."""
    colors = _THEMES.get(theme, _THEMES["neutral"])
    badge_text = badge or colors["label"]

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>{heading}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f4;">
  <tr>
    <td align="center" style="padding: 32px 16px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; width:100%; background-color:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 2px 10px rgba(15,45,36,0.08);">
        <tr>
          <td height="6" bgcolor="{colors['accent']}" style="background-color:{colors['accent']}; line-height:6px; font-size:6px;">&nbsp;</td>
        </tr>
        <tr>
          <td align="center" style="padding: 30px 32px 6px; font-family: -apple-system, Helvetica, Arial, sans-serif;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-bottom:16px;">
                  <img src="{LOGO_URL}" width="72" height="72" alt="airbnctours" style="display:block; width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid {colors['soft']};" />
                </td>
              </tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="{colors['soft']}" style="background-color:{colors['soft']}; border-radius:999px; padding:5px 14px;">
                  <span style="color:{colors['accent']}; font-size:11px; font-weight:700; letter-spacing:0.06em; font-family: -apple-system, Helvetica, Arial, sans-serif;">{badge_text}</span>
                </td>
              </tr>
            </table>
            <p style="color:#0f2d24 !important; margin: 16px 0 2px; font-size:21px; font-weight:700; font-family: -apple-system, Helvetica, Arial, sans-serif;">{heading}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 32px 28px; font-size:15px; line-height:1.65; color:#1e293b !important; text-align:left; font-family: -apple-system, Helvetica, Arial, sans-serif;">
            {body_html}
          </td>
        </tr>
        <tr>
          <td align="center" bgcolor="#0f2d24" style="background-color:#0f2d24; padding:16px 32px; font-family: -apple-system, Helvetica, Arial, sans-serif;">
            <span style="font-size:12px; color:#a7b5b0 !important;">airbnctours &middot; Sri Lanka</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
"""


def send_email(to_email, subject, html_body):
    """
    Sends an email via the Resend API.
    Ensure RESEND_API_KEY and RESEND_FROM_EMAIL are set in .env.
    Never raises — a failed/unconfigured email must never break the
    registration, approval, or booking action that triggered it.
    """
    api_key = os.environ.get("RESEND_API_KEY")
    from_email = os.environ.get("RESEND_FROM_EMAIL")

    if not api_key or not from_email:
        logging.warning("Resend not configured in .env. Skipping email.")
        return False

    if not to_email:
        return False

    try:
        response = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_body,
            },
            timeout=10,
        )
        if response.ok:
            logging.info(f"Email successfully sent to {to_email}: {subject}")
            return True
        logging.error(f"Resend API error sending to {to_email}: {response.status_code} {response.text}")
        return False
    except Exception as e:
        logging.error(f"Failed to send email to {to_email}: {str(e)}")
        return False
