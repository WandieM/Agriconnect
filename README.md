# AgriOpportunity — AgriConnect 360 · A4

One place for agricultural **bursaries, internships, learnerships, graduate placements, programmes and jobs**, matched to a young person's field, province and qualification, with closing-date reminders.

- **Mobile app:** React Native (Expo SDK 58) + TypeScript + Expo Router → `app/`
- **Backend:** Node.js + Express + TypeScript + PostgreSQL → `backend/`
- **Docs:** `docs/` · **Postman:** `postman/`

> All demo data is synthetic. Golden journey: **set profile → see matches → save one → receive a closing-date alert.**

## Demo accounts (seeded automatically)

| Role | Email | Password | Notes |
|---|---|---|---|
| Youth | lerato@agriopportunity.test | Youth@1234 | Profile set (Crop production · Limpopo · Diploma); one saved item with an alert already due |
| Youth (new) | thabo@agriopportunity.test | Youth@1234 | No profile yet — use to demo the golden journey from the start |
| Admin | admin@agriopportunity.test | Admin@1234 | Manage tab |

Seed closing dates are relative to the day the database is seeded, so the demo always has open items.

## 1. Run the backend locally

Node.js 20+ and PostgreSQL 13+.

```bash
cd backend
npm install
cp .env.example .env        # set DATABASE_URL and JWT_SECRET
npm run dev                 # creates tables, seeds demo data, listens on :4000
```

Check http://localhost:4000/api/v1/health → `{"status":"ok","database":"up"}`.

Tests: `createdb agriopportunity_test` then `npm test` (40 integration tests).

## 2. Deploy the backend to Render (free)

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → choose the repo. It creates `agriopportunity-db` (PostgreSQL) and `agriopportunity-api` (Node, root `backend/`).
3. Open `https://<your-service>.onrender.com/api/v1/health`.
4. Copy the base URL for the app.

Free Render services sleep after ~15 min idle (first request ~50 s; the app waits 60 s). Free Postgres expires after 30 days. Other hosts: same env vars as `backend/.env.example`, build `npm ci --include=dev && npm run build`, start `npm start`, `DATABASE_SSL=true` if the DB needs SSL.

## 3. Run the app

```bash
cd app
npm install
cp .env.example .env        # EXPO_PUBLIC_API_URL=<backend URL>
npx expo start
```

Android emulator → local backend: `http://10.0.2.2:4000`; a phone on the same Wi-Fi → `http://<your-PC-IP>:4000`.

## 4. Development build and public APK (EAS)

Put your Render URL in **`app/eas.json`** (three `EXPO_PUBLIC_API_URL` values) and `app/app.json` → `expo.extra.apiUrl`.

```bash
npm install -g eas-cli
eas login
cd app
eas build:configure
eas build -p android --profile development   # dev build; then: npx expo start --dev-client
eas build -p android --profile preview       # public APK (MVP 1)
```

EAS prints a build page link; **Install / Download** gives the `.apk`, and anyone with the link can install it. Choose "Generate new Android Keystore" the first time.

## 5. Test the API with Postman

Import `postman/AgriOpportunity.postman_collection.json` and the environment, set `baseUrl`, **Run collection**. Or:

```bash
npx newman run postman/AgriOpportunity.postman_collection.json --env-var baseUrl=https://<your-service>.onrender.com
```

## 6. Features (MVP 1)

| Area | Features |
|---|---|
| Account | Register (POPIA consent), sign in, secure token, delete account |
| Profile | Field, province, qualification level, optional phone |
| Matches | "N opportunities match your profile", ranked list, 3-check explanation per opportunity, close matches (2/3) |
| Browse | Search, type chips, province, field, closing in 7 days, soonest-closing first |
| Save + alerts | Save with a reminder 1/3/7 days before closing; due alerts shown on Matches and Saved; calendar file (.ics) with reminder |
| Apply | External link, or a simple in-app form (motivation + phone); one application per opportunity |
| Share | Share via the phone's share sheet |
| Offline | Saved list copied to the phone; offline banner |
| Admin | Create, edit, expire; open/closed lists with saves and applications; stats |

## 7. Documentation index

| Deliverable | File |
|---|---|
| AGENTS.md | `AGENTS.md` |
| Code walkthrough for the group | `CODE_GUIDE.md` |
| API documentation | `docs/API.md`, `docs/openapi.yaml` |
| System documentation | Shared Doc (link in `docs/System_Documentation.md`) |
| Design note (national platform) | `docs/Design_Note.md` |
| Project tracker | `docs/Project_Tracker.pdf` |
| Developer API test cases | `docs/API_Test_Cases.pdf`, `postman/` |
| UI/UX screens for Figma | `docs/ui/` |
| Video script | `docs/Video_Script.md` |
