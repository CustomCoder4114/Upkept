# Content

Shared by the backend (in-app guides, travel check) and the website (public guide pages).

## Guides: `guides/<country>/<item>.json`

- `<country>` is the ISO code in lower case (`ke`), `<item>` matches `Item.kind` with `-` for `_` (`driving-licence`).
- The format is defined and validated by `backend/app/services/guides.py` (`Guide`).
- Every guide needs **at least one official source** and a `last_checked` date.
- `cost.verified` is `true` only if the amount was checked on an official site on `last_checked`.
  If sources disagree, set `amount` to `null`, explain in `note`, and tell people to pay what the official invoice shows.
- `backend/tests/test_guides.py` fails when a guide is invalid or **older than 6 months**. That is on purpose:
  re-check it, update `last_checked`, and the build goes green again.

## Travel rules: `travel/passport-validity.json`

Rules per destination: `duration_of_stay`, `months_after_arrival` (+ `months`), `months_after_departure` (+ `months`).
Set `verified: true` only after checking the destination's own official page.
Destinations not listed are `unknown`: the travel check shows "check" instead of guessing "Not ready".

Before launch, every rule in this file should be checked against official sources and marked `verified: true`.
