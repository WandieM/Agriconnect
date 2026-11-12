# AGENTS.md — AgriOpportunity (AgriConnect 360 · A4)

Instructions for AI coding agents (and humans) working in this repository. Read this before changing code.

## 1. Product in one paragraph

AgriOpportunity is one searchable place for agricultural bursaries, internships, learnerships, graduate placements, programmes and jobs. A young person sets a short profile (field, province, qualification level) and sees how many opportunities match, ranked, with the reason for each match. They save opportunities, get a closing-date reminder, and apply by link or a simple form. Programme admins create, edit and expire opportunities.

**Golden journey (success test):** set profile → see matches → save one → receive a closing-date alert.

## 2. Repository layout

```
Agriconnect/
├── AGENTS.md            ← this file
├── CODE_GUIDE.md        ← plain-words walkthrough, split into 4 parts
├── README.md            ← setup, run, deploy, build APK
├── render.yaml          ← Render blueprint (API + PostgreSQL)
├── app/                 ← React Native (Expo SDK 58, TypeScript, Expo Router)
│   ├── src/app/         ← routes: (tabs) Matches, Browse, Saved, Manage, Profile; opportunity/[id], apply/[id], admin/edit, (auth)
│   ├── src/components/  ← ui.tsx, OpportunityCard, ProfileForm
│   ├── src/lib/         ← api client, auth, meta (dropdown lists), offline (Saved copy), theme, types
│   ├── app.json         ← Expo config
│   └── eas.json         ← EAS profiles (development, preview = APK, production)
├── backend/             ← Node.js + Express + TypeScript + PostgreSQL
│   ├── src/routes/      ← auth, profile, opportunities, me, admin, meta
│   ├── src/matching.ts  ← the 3-check matching rules (plain function)
│   ├── src/db/          ← schema.sql, opportunities.ts (shared queries), migrate, seed, pool
│   ├── src/middleware/  ← JWT auth, role checks, errors
│   └── tests/           ← Vitest + Supertest integration tests
├── docs/                ← API docs, OpenAPI, design note, tracker, test cases, UI screens
└── postman/             ← Postman collection + environment
```

## 3. Tech stack (fixed — do not swap without approval)

| Layer | Choice |
|---|---|
| Mobile | React Native via **Expo SDK 58**, TypeScript (strict), Expo Router, expo-secure-store, AsyncStorage |
| API | Node.js 20+, Express 4, TypeScript (strict), Zod validation |
| Database | PostgreSQL 13+ (`pg`, raw parameterised SQL, no ORM) |
| Auth | bcryptjs, JWT Bearer tokens (roles `youth`, `admin`) |
| Tests | Vitest + Supertest, Postman/Newman |
| Hosting | Render via `render.yaml` |
| Builds | EAS Build — `preview` profile produces the public APK |

## 4. Commands

```bash
# Backend
cd backend && npm install && cp .env.example .env
npm run dev                # migrates + seeds (SEED_ON_START=true)
npm test                   # needs database agriopportunity_test
npm run typecheck

# App
cd app && npm install && cp .env.example .env
npx expo start
npx tsc --noEmit
npx expo install <pkg>     # ALWAYS use this to add packages
eas build -p android --profile development
eas build -p android --profile preview      # public APK (MVP 1)
```

## 5. How matching works (keep it explainable)

Each open opportunity is checked against the profile on three rules in `backend/src/matching.ts` (one small function):

| Check | Passes when |
|---|---|
| Field | opportunity field = profile field, or opportunity field is `any` |
| Province | opportunity province = profile province, or `National` |
| Level | profile level ≥ opportunity minimum level |

Score = number of checks passed (0–3). **Full match = 3/3** (this is the "N opportunities match your profile" count). The matches list shows score 3 then score 2, soonest closing first. Every check is returned with a plain-language reason. Do not add hidden weights; if you change the rules, update the reasons, the docs and the tests. Keep the code simple enough for any group member to explain.

## 6. Rules for every change

1. **Synthetic data only.** Organisations end in "(demo)"; demo emails end in `@agriopportunity.test`; apply links use `example.org`.
2. **Parameterised SQL only.** No string-built SQL with user input.
3. **Validate every body and query** with Zod via `parse()`. Errors use `{ error: { code, message, details } }`.
4. **Server-side role checks** (`requireAuth`, `requireRole`). The app hiding a tab is not security.
5. **Open = `status = 'active'` AND closing date ≥ today (Africa/Johannesburg).** Use `OPEN_SQL` / `isOpen()`; never re-type the rule.
6. **POPIA.** Registration needs `consent: true` (stored as `consent_at`). Collect only field, province, level and optional phone. Users can delete their account (`DELETE /auth/me`).
7. **Low data.** Lists are small JSON with no images; dropdown lists are built into the app; the Saved list is copied to the phone for offline use.
8. **Version the API** under `/api/v1`.
9. **Update docs** (`docs/API.md`, `docs/openapi.yaml`, Postman) in the same pull request as an API change.
10. **Expo changes every SDK** — check the versioned docs; never hand-edit native folders.

## 7. Out of scope (with reasons) — do not build

| Out of scope | Reason |
|---|---|
| Hosting full applications, CVs and documents | Organisations already run their own application systems; we link to them or take a short expression of interest |
| Competing with national youth platforms | Design note: we import their listings and send people to them (docs/Design_Note.md) |
| Push notifications | Brief lists them as a stretch; MVP uses in-app alerts plus a calendar file with a reminder |
| Payments, stipend administration | Not part of the brief |
| AI/CV matching | Matching must stay explainable (three rules) |

## 8. Integrations (AgriConnect 360)

- **Identity (Platform Kit):** this MVP issues its own JWT; the shared middleware can replace `middleware/auth.ts` with the same `req.user` shape.
- **Skills Passport (A2):** consumes profile data with consent — mocked; the profile form is the stand-in.
- **Provides:** the public search API `GET /api/v1/opportunities` (MyAgriSETA can show open agri opportunities).
- **External feed (stretch, planned):** an import endpoint for a national platform's listings — see `docs/Design_Note.md`.

## 9. Definition of done

Feature works on the APK against the deployed API; typecheck passes in both projects; `npm test` passes; Postman collection updated and passing; docs and AI-use declaration updated.
