# Upkept: Phase 1

One app for everything in your life that can expire, and help getting each one renewed.

```
upkept/
├── backend/              FastAPI + PostgreSQL + Celery worker/beat (Python)
├── content/              Country guides + travel rules (JSON), shared by backend and website
├── packages/api-client/  One TypeScript API client for web + mobile
├── mobile/               Expo (React Native) app: the four designed screens + the rest
├── web/                  Next.js: public guide pages (SEO) and landing page
└── .github/workflows/    Tests on every push + weekly (catches stale guides)
```

## 1. Backend

```bash
cd backend
cp .env.example .env            # fill in JWT_SECRET and ENCRYPTION_KEYS (commands are in the file)
docker compose up -d postgres redis
pip install -r requirements.txt
alembic revision --autogenerate -m "initial tables"   # first time only; review the file it writes
alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000/docs
```

Worker and scheduler (reminders), in two more terminals, or just `docker compose up` for everything:

```bash
celery -A app.workers.celery_app.celery worker --loglevel=info
celery -A app.workers.celery_app.celery beat --loglevel=info     # run exactly ONE beat
```

Tests: `pytest -q` (41 tests: reminder timing, urgency, travel check, guides, encryption, document reading, score, money).

**AI reading.** `AI_PROVIDER=rules` (default) is free and needs no network. Set `AI_PROVIDER=anthropic` and
`ANTHROPIC_API_KEY` to use Claude when the rules aren't confident. ID and policy numbers are replaced with
`[NUM1]`-style placeholders before anything is sent, and put back afterwards.

## 2. Mobile app

```bash
npm install                      # at the repo root (links the shared api-client)
cd mobile
cp .env.example .env             # EXPO_PUBLIC_API_URL = your computer's local IP, port 8000
npm run setup                    # installs Expo packages at versions matching your Expo SDK
npx expo run:android             # needs a development build: ML Kit + SQLCipher don't run in Expo Go
```

For push notifications on a real phone: create an EAS project (`npx eas init`) and put its id in `app.json`.

## 3. Website

```bash
cd web && npm run setup && npm run dev     # http://localhost:3000/guides/ke/passport
```

## 4. API client

Written by hand for Phase 1 (`packages/api-client/src/types.ts`). Once the backend runs,
`npm run generate` in that folder writes types from FastAPI's OpenAPI schema; switch to them then.

---

## What's in Phase 1

- Sign up / sign in, one profile (family profiles behind Premium), full account deletion
- Snap → on-phone text reading (ML Kit) → rules reader → optional AI → **"Is this right?"** with unsure fields marked
- Items with encrypted numbers (only last 4 shown), timeline (Needs you / Coming up / Later), Life in Order score
- Reminders by item type (passport 180/90/30/7 days, car insurance 30/7/1, subscription 3...), sent at 9am local time,
  by push **and** email, escalated when ignored, never double-sent (see `workers/tasks.py`)
- "Get it done" checklist from the country guide, or a general one per item type; "Snap new one" resets the item
- Encrypted document storage (encrypted by us before it reaches R2), offline vault in SQLCipher on the phone
- Travel check with per-destination rules; unknown destinations get "check", never a guessed "Not ready"
- Money view built from items (no bank login)
- App lock (face / fingerprint / phone PIN) after a minute in the background
- Kenya guides: passport, driving licence. Public SEO pages with HowTo structured data

## Before launch

- [ ] **Verify guide fees on official sites.** Both Kenya guides are marked `verified: false` because sources
      disagree (e.g. passport: embassies list KES 4,550–7,550, while 2026 reports say only the 66-page booklet at
      about KES 12,500 was offered). The apps tell users to pay what the official invoice shows.
- [ ] **Verify every rule in `content/travel/passport-validity.json`** against each destination's official page.
- [ ] Data protection: check registration with Kenya's ODPC and the rules of every launch country.
- [ ] Security review (an outside one). Keys in a secrets manager, not `.env`.
- [ ] Trademark search for the name.
- [ ] Rate-limit `/auth/login` and `/scan` (e.g. at the proxy or with slowapi).

## Phase 2 (models exist, routes don't yet)

Family sharing and emergency access (`ProfileShare`), expiring share links (`ShareLink`), email forwarding
(`name@in.upkept.app`), WhatsApp/SMS, custom reminder days per item, Premium billing.
