"""Push notifications through Expo's push service."""
from dataclasses import dataclass

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


@dataclass
class PushResult:
    ok: bool
    ticket_id: str | None = None
    error: str | None = None
    token_invalid: bool = False  # the app was uninstalled; delete the device row


def send_push(token: str, title: str, body: str, data: dict | None = None) -> PushResult:
    import httpx

    resp = httpx.post(
        EXPO_PUSH_URL,
        json={"to": token, "title": title, "body": body, "data": data or {}, "sound": "default",
              "channelId": "reminders"},
        headers={"accept": "application/json"},
        timeout=15,
    )
    if resp.status_code >= 400:
        return PushResult(False, error=f"HTTP {resp.status_code}: {resp.text[:200]}")
    ticket = resp.json().get("data", {})
    if ticket.get("status") == "ok":
        return PushResult(True, ticket_id=ticket.get("id"))
    details = ticket.get("details") or {}
    return PushResult(False, error=ticket.get("message"),
                      token_invalid=details.get("error") == "DeviceNotRegistered")
