# AgriOpportunity API Documentation (v1)

**Base URL:** `https://<your-service>.onrender.com/api/v1` (local `http://localhost:4000/api/v1`)
**Format:** JSON (UTF-8). Dates are `YYYY-MM-DD` in South African time.
**Contract:** [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.0; paste into https://editor.swagger.io).

## Authentication

`POST /auth/register` or `POST /auth/login` returns `{ token, user }`. Send `Authorization: Bearer <token>` on protected routes. JWT (HS256), valid 7 days. Roles: `youth` (self-registered) and `admin` (seeded only).

## Errors

```json
{ "error": { "code": "BAD_REQUEST", "message": "Validation failed", "details": { "field": ["Invalid enum value"] } } }
```

| HTTP | code | When |
|---|---|---|
| 400 | BAD_REQUEST | Validation failed, malformed JSON, invalid id, wrong apply method |
| 401 | UNAUTHORIZED | Missing/invalid token, wrong login |
| 403 | FORBIDDEN | Wrong role |
| 404 | NOT_FOUND | Resource or route not found |
| 409 | CONFLICT | Duplicate email, no profile yet (matches), opportunity closed, already applied |
| 413 | PAYLOAD_TOO_LARGE | Body over 1 MB |
| 429 | TOO_MANY_REQUESTS | Over 50 auth attempts in 15 minutes |
| 500 | INTERNAL_ERROR | Unexpected |

## Endpoint summary (25)

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 1 | GET | `/health` | — | API and database status |
| 2 | GET | `/meta` | — | Provinces, fields, levels, types (one cached call) |
| 3 | POST | `/auth/register` | — | Create youth account (POPIA consent) |
| 4 | POST | `/auth/login` | — | Sign in |
| 5 | GET | `/auth/me` | any | Current user + profile |
| 6 | DELETE | `/auth/me` | youth | Delete account and all data |
| 7 | GET | `/profile` | youth | Matching profile |
| 8 | PUT | `/profile` | youth | Create or replace profile |
| 9 | GET | `/opportunities` | optional | Search open opportunities |
| 10 | GET | `/opportunities/matches` | youth | Match count + ranked list |
| 11 | GET | `/opportunities/:id` | optional | One opportunity (+ match, saved, applied) |
| 12 | GET | `/opportunities/:id/calendar.ics` | — | Calendar file with a reminder |
| 13 | POST | `/opportunities/:id/save` | youth | Save + set closing-date alert |
| 14 | DELETE | `/opportunities/:id/save` | youth | Unsave (removes alert) |
| 15 | POST | `/opportunities/:id/apply` | youth | Apply with the simple form |
| 16 | GET | `/me/saved` | youth | Saved list |
| 17 | GET | `/me/alerts` | youth | Due and upcoming closing-date alerts |
| 18 | PATCH | `/me/alerts/:id/dismiss` | youth | Dismiss an alert |
| 19 | GET | `/me/applications` | youth | My applications |
| 20 | GET | `/admin/opportunities` | admin | List open / closed / all with saves and applications |
| 21 | POST | `/admin/opportunities` | admin | Create |
| 22 | PATCH | `/admin/opportunities/:id` | admin | Edit (also reopen) |
| 23 | PATCH | `/admin/opportunities/:id/expire` | admin | Expire now |
| 24 | GET | `/admin/opportunities/:id/applications` | admin | Applications for one opportunity |
| 25 | GET | `/admin/stats` | admin | Counts |

---

## Reference values (`GET /meta`)

| List | Values |
|---|---|
| provinces | Eastern Cape, Free State, Gauteng, KwaZulu-Natal, Limpopo, Mpumalanga, North West, Northern Cape, Western Cape |
| fields (slug) | crop-production, animal-production, agri-economics, agri-processing, agri-engineering, horticulture, natural-resources (opportunities may also use `any`) |
| levels | 0 Below Grade 12 · 1 Grade 12 (Matric) · 2 Certificate (NQF 5) · 3 Diploma (NQF 6) · 4 Degree (NQF 7) · 5 Postgraduate (NQF 8+) |
| types (slug) | bursary, internship, learnership, graduate_placement, programme, job |

Opportunity province may also be `National`.

## Auth

**`POST /auth/register`** `{ name (2–100), email, password (8–72, a letter and a number), consent: true }` → `201 { token, user: { id, name, email, role: "youth", profile: null } }`. `400` (incl. missing consent) · `409` email exists.

**`POST /auth/login`** `{ email, password }` → `200 { token, user }`. Wrong email or password → `401 "Email or password is incorrect"`.

**`GET /auth/me`** → `{ user: { ..., profile: { field, province, level, phone } | null } }`. **`DELETE /auth/me`** → `204`; profile, saved items, alerts and applications are deleted too.

## Profile

**`PUT /profile`** `{ field: slug, province, level: 0–5, phone?: string|null }` → `200 { profile }`.

## Opportunities

### Opportunity object

```json
{
  "id": "6017c81f-...", "title": "Crop Production Internship 2027",
  "type": { "slug": "internship", "name": "Internship" },
  "organisation": "Mopani Fresh Produce", "description": "12-month internship ...",
  "field": { "slug": "crop-production", "name": "Crop production" }, "province": "Limpopo",
  "minLevel": { "level": 3, "name": "Diploma (NQF 6)" }, "stipend": "R6 500 per month",
  "closingDate": "2026-11-13", "daysLeft": 2, "isOpen": true, "status": "active",
  "applyMethod": "form", "applyUrl": null,
  "calendarUrl": "/api/v1/opportunities/6017c81f-.../calendar.ics",
  "match": {
    "score": 3, "outOf": 3, "isFullMatch": true,
    "reasons": [
      { "check": "field", "ok": true, "text": "Your field: Crop production" },
      { "check": "province", "ok": true, "text": "In your province: Limpopo" },
      { "check": "level", "ok": true, "text": "You meet the minimum: Diploma (NQF 6)" }
    ]
  },
  "saved": true, "alertDaysBefore": 3, "applied": false
}
```

`match`, `saved`, `alertDaysBefore` and `applied` appear only for a signed-in youth (match needs a profile). **Open** means status `active` and closing date today or later.

### Matching rules

| Check | Passes when |
|---|---|
| field | opportunity field = profile field, or `any` |
| province | opportunity province = profile province, or `National` |
| level | profile level ≥ opportunity minimum |

Score = checks passed. Full match = 3/3. The code is one small function: `backend/src/matching.ts`. Failed checks explain why, e.g. "Needs Agricultural engineering & mechanisation", "Only in Gauteng", "Needs at least Degree (NQF 7)".

### `GET /opportunities`

| Query | Type | Notes |
|---|---|---|
| q | string ≤ 100 | title, organisation, description |
| type | type slug | |
| province | province or `National` | a province also returns `National` items |
| field | field slug or `any` | a field also returns `any` items |
| closingWithin | 0–365 | days from today |
| limit | 1–100 (default 100) | |

Always sorted by soonest closing date.

→ `200 { items, total }` (open only).

### `GET /opportunities/matches` (youth)
→ `200 { matchCount, partialCount, profile, items }`. The API loads all open opportunities, scores each one, keeps scores 3 and 2 (3 first, soonest closing first). `409` if no profile yet.

### `GET /opportunities/:id/calendar.ics?daysBefore=3`
`text/calendar` file: an all-day event on the closing date with a `VALARM` reminder `daysBefore` days earlier (0–30, default 3).

### `POST /opportunities/:id/save` (youth)
Body `{ daysBefore?: 0–30 }` (default 3) → `201 { opportunity }`. Saves the item and sets the alert date to closing date minus `daysBefore`. Saving again updates the alert. `409` if closed.

### `POST /opportunities/:id/apply` (youth)
Body `{ motivation (20–1500), phone? }` → `201 { application: { id, opportunityId, status, createdAt } }`. `400` if the opportunity uses an external link · `409` if closed or already applied.

## Me (youth)

**`GET /me/alerts`** → `{ due: Alert[], upcoming: Alert[] }`. An alert is **due** when today ≥ `remindOn` and the opportunity is still open.

```json
{ "id": "...", "opportunityId": "...", "title": "Crop Production Internship 2027", "organisation": "...",
  "closingDate": "2026-11-13", "remindOn": "2026-11-10", "daysBefore": 3, "daysLeft": 2,
  "message": "Crop Production Internship 2027 closes in 2 days" }
```

**`PATCH /me/alerts/:id/dismiss`** → `204`. **`GET /me/saved`** → `{ items }`. **`GET /me/applications`** → `{ items: [{ id, status, createdAt, opportunity: { id, title, organisation } }] }`.

## Admin

**`POST /admin/opportunities`**

| Field | Rules |
|---|---|
| title | 5–140 |
| type | type slug |
| organisation | 2–120 |
| description | 20–3000 |
| field | field slug or `any` |
| province | province or `National` |
| minLevel | 0–5 (default 0) |
| stipend | ≤ 80, optional |
| closingDate | YYYY-MM-DD, not in the past |
| applyMethod | `link` \| `form` |
| applyUrl | URL, required when `link` |

→ `201 { opportunity }`.

**`PATCH /admin/opportunities/:id`**: send only the fields to change (plus `status: active|expired`). The API merges them with the saved values and checks the whole opportunity again. A new closing date moves the alert dates with it. **`PATCH /admin/opportunities/:id/expire`**: expires now. **`GET /admin/opportunities?status=open|closed|all`**: includes `saves` and `applications` counts.

**`GET /admin/stats`** → `{ youth, profiles, openOpportunities, closingThisWeek, saves, applications }`.

## Data model

```
users (id, name, email UNIQUE, password_hash, role youth|admin, consent_at, created_at)
  1 ─ 0..1 profiles (user_id PK/FK, field, province, level 0–5, phone, updated_at)
  1 ─ *    saved_opportunities (user_id, opportunity_id) PK both
  1 ─ *    alerts (id, user_id, opportunity_id, days_before, remind_on, dismissed_at) UNIQUE(user, opp)
  1 ─ *    applications (id, user_id, opportunity_id, motivation, phone, status) UNIQUE(user, opp)
opportunities (id, title, type, organisation, description, field, province, min_level, stipend, closing_date,
               apply_method, apply_url, status, created_by, created_at, updated_at)
```

## Security controls

bcrypt hashes; JWT secret from environment; parameterised SQL (tested with an injection string); Zod on every input; server-side role checks; Helmet, CORS, 1 MB body limit, login rate limit; POPIA consent stored, minimal data, account deletion; no real personal data (people are invented; real opportunity listings link to their official adverts).
