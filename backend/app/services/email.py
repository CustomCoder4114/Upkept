"""Email through Resend. Email is the backup when push is blocked or delayed."""
from html import escape

from app.config import get_settings


def send_email(to: str, subject: str, text: str, action_url: str | None = None) -> str:
    """Send and return the provider's message id. Raises on failure."""
    import httpx

    s = get_settings()
    if not s.resend_api_key:
        raise RuntimeError("RESEND_API_KEY is not set")
    html = f"<p>{escape(text)}</p>"
    if action_url:
        html += f'<p><a href="{escape(action_url)}">Open in Upkept</a></p>'
    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {s.resend_api_key}"},
        json={"from": s.email_from, "to": [to], "subject": subject, "text": text, "html": html},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get("id", "")
