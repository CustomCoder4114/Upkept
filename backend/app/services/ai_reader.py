"""read_document(): the one place that reads documents. Swap providers here only.

Flow (matches the plan):
  1. The phone reads the text for free (ML Kit) and sends it with the scan.
  2. A free rule-based reader tries first. If it's confident, we stop: no AI cost.
  3. Otherwise the text goes to the AI provider, with ID/policy numbers replaced
     by placeholders ([NUM1]...). The AI never sees the real numbers; we put them
     back afterwards. Images are only sent if the user allowed it and there's no text.
  4. Sanity checks flag anything odd; the user always confirms on screen.
"""
import json
import re
from dataclasses import dataclass, field
from datetime import date, timedelta

# ---------------------------------------------------------------- result types


@dataclass
class ScanField:
    value: str | None
    confidence: float  # 0..1; the app outlines fields under 0.7 in amber


@dataclass
class ScanResult:
    kind: ScanField
    category: ScanField
    title: ScanField
    issuer: ScanField
    number: ScanField
    starts_on: ScanField
    ends_on: ScanField
    amount: ScanField  # decimal string, e.g. "42000.00"
    currency: ScanField
    provider: str
    warnings: list[str] = field(default_factory=list)

    def is_confident(self) -> bool:
        return self.kind.value not in (None, "other") and self.ends_on.value is not None and self.ends_on.confidence >= 0.8


KIND_TO_CATEGORY = {
    "passport": "travel", "visa": "travel", "national_id": "identity", "driving_licence": "vehicles",
    "car_insurance": "insurance", "home_insurance": "insurance", "health_insurance": "health",
    "warranty": "purchases", "receipt": "purchases", "subscription": "money", "work_permit": "work",
    "vehicle_inspection": "vehicles", "lease": "home", "other": "personal",
}
KIND_TITLES = {
    "passport": "Passport", "visa": "Visa", "national_id": "National ID", "driving_licence": "Driving licence",
    "car_insurance": "Car insurance", "home_insurance": "Home insurance", "health_insurance": "Medical cover",
    "warranty": "Warranty", "receipt": "Receipt", "subscription": "Subscription", "work_permit": "Work permit",
    "vehicle_inspection": "Vehicle inspection", "lease": "Lease", "other": "Document",
}

# ---------------------------------------------------------------- redaction

_NUMBER_RE = re.compile(r"\b(?=[A-Za-z0-9/-]*\d)[A-Za-z0-9][A-Za-z0-9/-]{4,}[A-Za-z0-9]\b")
_DATE_LIKE_RE = re.compile(r"^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})$")


def redact(text: str) -> tuple[str, dict[str, str]]:
    """Replace ID-like numbers with [NUM1], [NUM2]...; dates are left alone."""
    mapping: dict[str, str] = {}
    reverse: dict[str, str] = {}

    def sub(m: re.Match) -> str:
        token = m.group(0)
        if _DATE_LIKE_RE.match(token) or token.isalpha():
            return token
        if token not in reverse:
            key = f"[NUM{len(mapping) + 1}]"
            mapping[key] = token
            reverse[token] = key
        return reverse[token]

    return _NUMBER_RE.sub(sub, text), mapping


def unredact(value: str | None, mapping: dict[str, str]) -> str | None:
    if value is None:
        return None
    for key, original in mapping.items():
        value = value.replace(key, original)
    return value


# ---------------------------------------------------------------- dates

_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}
_MON = r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
_DATE_PATTERNS = [
    (re.compile(rf"\b(\d{{1,2}})(?:st|nd|rd|th)?[ .-]{_MON}[ .,-]+(\d{{4}})\b", re.I), "d_mon_y"),
    (re.compile(rf"\b{_MON}[ .]+(\d{{1,2}})(?:st|nd|rd|th)?,?[ ]+(\d{{4}})\b", re.I), "mon_d_y"),
    (re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b"), "iso"),
    (re.compile(r"\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b"), "numeric"),
]
_END_WORDS = ("expir", "valid until", "valid to", "valid thru", "end", "renewal date", "due", "to:", "until", "cover to")
_START_WORDS = ("issue", "start", "from", "effective", "commence", "purchase", "date of sale", "cover from")


def _make_date(y: int, m: int, d: int) -> date | None:
    try:
        return date(y, m, d)
    except ValueError:
        return None


def find_dates(text: str, month_first: bool = False) -> list[tuple[int, date]]:
    """All dates in the text with their position. Numeric dates are day-first unless month_first."""
    found: dict[int, date] = {}
    for pattern, style in _DATE_PATTERNS:
        for m in pattern.finditer(text):
            if any(abs(m.start() - p) < 3 for p in found):
                continue
            g = m.groups()
            if style == "d_mon_y":
                d = _make_date(int(g[2]), _MONTHS[g[1][:3].lower()], int(g[0]))
            elif style == "mon_d_y":
                d = _make_date(int(g[2]), _MONTHS[g[0][:3].lower()], int(g[1]))
            elif style == "iso":
                d = _make_date(int(g[0]), int(g[1]), int(g[2]))
            else:
                a, b, y = int(g[0]), int(g[1]), int(g[2])
                day, month = (b, a) if month_first else (a, b)
                d = _make_date(y, month, day)
            if d:
                found[m.start()] = d
    return sorted(found.items())


def _label_before(text: str, pos: int) -> str:
    line_start = text.rfind("\n", 0, pos) + 1
    return text[max(line_start, pos - 40):pos].lower()


# ---------------------------------------------------------------- rule-based reader

_KIND_RULES: list[tuple[str, tuple[str, ...], tuple[str, ...]]] = [
    # (kind, all of these..., any of these)
    ("passport", (), ("passport",)),
    ("driving_licence", (), ("driving licence", "driving license", "driver's license", "drivers licence")),
    ("visa", (), ("visa ", "entry clearance", "evisa")),
    ("work_permit", (), ("work permit", "class d permit")),
    ("national_id", (), ("national id", "identity card", "huduma")),
    ("car_insurance", ("insur",), ("motor", "vehicle", "private car", "comprehensive", "third party")),
    ("health_insurance", ("insur",), ("medical", "health", "inpatient", "outpatient")),
    ("home_insurance", ("insur",), ("home", "domestic", "property", "household")),
    ("health_insurance", (), ("medical cover", "health cover")),
    ("warranty", (), ("warranty", "guarantee")),
    ("vehicle_inspection", (), ("inspection certificate", "roadworthiness")),
    ("lease", (), ("tenancy", "lease agreement")),
    ("subscription", (), ("subscription", "membership", "renews on", "auto-renew")),
    ("receipt", (), ("receipt", "invoice", "tax invoice")),
]
_CURRENCY_RE = re.compile(r"(KES|KSh|Ksh|Kshs|USD|US\$|\$|EUR|€|GBP|£|NGN|₦|UGX|TZS|ZAR|INR|₹)\s?([0-9][0-9,]*(?:\.\d{1,2})?)")
_CURRENCY_CODES = {"ksh": "KES", "kshs": "KES", "kes": "KES", "usd": "USD", "us$": "USD", "$": "USD", "eur": "EUR",
                   "€": "EUR", "gbp": "GBP", "£": "GBP", "ngn": "NGN", "₦": "NGN", "ugx": "UGX", "tzs": "TZS",
                   "zar": "ZAR", "inr": "INR", "₹": "INR"}
_NUMBER_LABEL_RE = re.compile(
    r"(policy|passport|licen[cs]e|certificate|cert|member(?:ship)?|account|serial|document|id)\s*(?:no\.?|number|#)\s*[:.]?\s*([A-Za-z0-9][A-Za-z0-9/-]{3,})",
    re.I)
_ISSUER_RE = re.compile(r"^.*\b(insurance|assurance|limited|ltd|plc|company|bank|authority|directorate|ministry)\b.*$",
                        re.I | re.M)


def read_with_rules(text: str, month_first: bool = False) -> ScanResult:
    low = text.lower()

    kind, kind_conf = "other", 0.3
    for k, all_of, any_of in _KIND_RULES:
        if all(w in low for w in all_of) and any(w in low for w in any_of):
            kind, kind_conf = k, 0.85
            break

    dates = find_dates(text, month_first)
    starts = ends = None
    s_conf = e_conf = 0.0
    for pos, d in dates:
        label = _label_before(text, pos)
        if any(w in label for w in _END_WORDS) and ends is None:
            ends, e_conf = d, 0.9
        elif any(w in label for w in _START_WORDS) and starts is None:
            starts, s_conf = d, 0.85
    if ends is None and dates:
        ends, e_conf = max(d for _, d in dates), 0.5
    if starts is None and len(dates) > 1:
        earliest = min(d for _, d in dates)
        if earliest != ends:
            starts, s_conf = earliest, 0.5

    amount = currency = None
    a_conf = 0.0
    amounts = []
    for m in _CURRENCY_RE.finditer(text):
        value = float(m.group(2).replace(",", ""))
        label = _label_before(text, m.start())
        weight = 2 if any(w in label for w in ("premium", "total", "amount", "price", "paid")) else 1
        amounts.append((weight, value, _CURRENCY_CODES.get(m.group(1).lower(), m.group(1).upper())))
    if amounts:
        weight, value, currency = max(amounts)
        amount, a_conf = f"{value:.2f}", 0.8 if weight == 2 else 0.55

    number = None
    n_conf = 0.0
    m = _NUMBER_LABEL_RE.search(text)
    if m:
        number, n_conf = m.group(2), 0.8

    issuer = None
    i_conf = 0.0
    m = _ISSUER_RE.search(text)
    if m:
        issuer, i_conf = m.group(0).strip()[:120], 0.6

    return ScanResult(
        kind=ScanField(kind, kind_conf),
        category=ScanField(KIND_TO_CATEGORY.get(kind, "personal"), kind_conf),
        title=ScanField(KIND_TITLES.get(kind, "Document"), kind_conf),
        issuer=ScanField(issuer, i_conf),
        number=ScanField(number, n_conf),
        starts_on=ScanField(starts.isoformat() if starts else None, s_conf),
        ends_on=ScanField(ends.isoformat() if ends else None, e_conf),
        amount=ScanField(amount, a_conf),
        currency=ScanField(currency, a_conf),
        provider="rules",
    )


# ---------------------------------------------------------------- sanity checks


def sanity_check(r: ScanResult, today: date) -> ScanResult:
    def as_date(f: ScanField) -> date | None:
        try:
            return date.fromisoformat(f.value) if f.value else None
        except ValueError:
            f.confidence = 0.0
            return None

    start, end = as_date(r.starts_on), as_date(r.ends_on)
    if start and end and end <= start:
        r.warnings.append("The end date is before the start date. Please check both.")
        r.starts_on.confidence = r.ends_on.confidence = min(r.ends_on.confidence, 0.3)
    if end and end > today + timedelta(days=365 * 20):
        r.warnings.append("The end date is more than 20 years away. Please check it.")
        r.ends_on.confidence = min(r.ends_on.confidence, 0.3)
    if end and end < today - timedelta(days=365 * 5):
        r.warnings.append("This looks like an old document (ended over 5 years ago).")
    if r.ends_on.value is None:
        r.warnings.append("We couldn't find an end date. Please add it.")
    if r.amount.value:
        try:
            if float(r.amount.value) < 0:
                r.amount.confidence = 0.0
        except ValueError:
            r.amount.value, r.amount.confidence = None, 0.0
    return r


# ---------------------------------------------------------------- AI provider

_AI_PROMPT = """You read a document that may expire (ID, passport, insurance, warranty, receipt, subscription...).
Numbers have been replaced with placeholders like [NUM1]; return placeholders unchanged where a number belongs.
Return ONLY a JSON object with these keys, each {"value": string or null, "confidence": number 0-1}:
kind (one of: %s), issuer, number, starts_on (YYYY-MM-DD), ends_on (YYYY-MM-DD), amount (decimal, no commas), currency (ISO 4217).
Numeric dates in this document are %s.

Document text:
%s"""


def _read_with_anthropic(text: str, month_first: bool, api_key: str, model: str) -> ScanResult:
    import httpx  # imported here so the rest of this module works without it

    redacted, mapping = redact(text)
    prompt = _AI_PROMPT % (", ".join(KIND_TO_CATEGORY), "month-first (MM/DD/YYYY)" if month_first
                           else "day-first (DD/MM/YYYY)", redacted[:8000])
    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
        json={"model": model, "max_tokens": 600, "messages": [{"role": "user", "content": prompt}]},
        timeout=30,
    )
    resp.raise_for_status()
    raw = resp.json()["content"][0]["text"]
    data = json.loads(raw[raw.find("{"): raw.rfind("}") + 1])

    def f(key: str) -> ScanField:
        entry = data.get(key) or {}
        return ScanField(unredact(entry.get("value"), mapping), float(entry.get("confidence") or 0))

    kind = f("kind")
    if kind.value not in KIND_TO_CATEGORY:
        kind = ScanField("other", 0.3)
    return ScanResult(
        kind=kind,
        category=ScanField(KIND_TO_CATEGORY[kind.value], kind.confidence),
        title=ScanField(KIND_TITLES[kind.value], kind.confidence),
        issuer=f("issuer"), number=f("number"), starts_on=f("starts_on"), ends_on=f("ends_on"),
        amount=f("amount"), currency=f("currency"), provider="anthropic",
    )


# ---------------------------------------------------------------- entry point


def read_document(
    text: str,
    *,
    today: date,
    month_first: bool = False,
    provider: str = "rules",
    api_key: str | None = None,
    model: str = "claude-haiku-5-5",
    ai_allowed: bool = True,
) -> ScanResult:
    """Read a document's text. `ai_allowed` is False when the user is over their scan limit or budget."""
    result = read_with_rules(text, month_first)
    if provider == "anthropic" and api_key and ai_allowed and not result.is_confident() and text.strip():
        result = _read_with_anthropic(text, month_first, api_key, model)
    return sanity_check(result, today)
