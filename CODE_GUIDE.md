# CODE_GUIDE.md: how the code works, in plain words

Read this before the presentation. The code is split into **4 parts, one per group member**. Each part lists the files to know, what they do, and questions a marker is likely to ask, with short answers.

## The big picture (everyone should know this)

```
Phone app (React Native / Expo)  ──HTTPS + JSON──>  API (Node.js / Express)  ──SQL──>  PostgreSQL database
         app/                                         backend/                           tables in schema.sql
```

1. The **app** never touches the database. It calls the API, for example `GET /api/v1/opportunities/matches`.
2. The **API** checks who you are (token), what you're allowed to do (role) and what you sent (validation), then runs SQL.
3. The **database** stores users, profiles, opportunities, saved items, alerts and applications.

**Golden journey:** register → set profile → see matches → save one → closing-date alert.

How to run it: see `README.md`. Demo logins are on the sign-in screen.

---

## Part 1: Backend basics, accounts and security

**Files:** `backend/src/index.ts`, `app.ts`, `config.ts`, `routes/auth.ts`, `routes/profile.ts`, `middleware/auth.ts`, `middleware/error.ts`, `db/pool.ts`

**What happens:**
- `index.ts` is where the server starts. It creates the tables, adds demo data if the database is empty, then listens for requests.
- `app.ts` plugs in one router per area: `/auth`, `/profile`, `/opportunities`, `/me`, `/admin`.
- **Register** (`POST /auth/register`) checks the input, refuses without POPIA consent, hashes the password with bcrypt and stores the user.
- **Login** compares the password with the hash and returns a **JWT token**. The app sends it with every request as `Authorization: Bearer <token>`.
- `requireAuth` checks the token. `requireRole('admin')` checks the role.

**Likely questions**
| Question | Answer |
|---|---|
| How are passwords stored? | Never as plain text. bcrypt turns them into a hash; on login we compare hashes. |
| What is a JWT? | A signed "ticket" holding the user id and role. The server can check the signature, so it can't be faked. |
| How do you stop a youth using admin routes? | `requireRole('admin')` runs on the server for every admin route, so hiding a tab in the app is not our only protection. |
| How do you stop SQL injection? | We never put user text into SQL. Values go in a separate list (`$1, $2`); test TC-24 tries `'; DROP TABLE` and nothing happens. |
| Where is POPIA handled? | Consent is required at registration (`consent_at` is stored), we only collect what matching needs, and `DELETE /auth/me` deletes everything. |

---

## Part 2: Matching and opportunities (the core feature)

**Files:** `backend/src/matching.ts`, `db/opportunities.ts`, `routes/opportunities.ts`, `db/schema.sql`

**What happens:**
- `matching.ts` has one function, `matchOpportunity(opportunity, profile)`, with three yes/no rules:
  1. **Field:** same field, or the opportunity accepts any field
  2. **Province:** same province, or the opportunity is national
  3. **Level:** your qualification level ≥ the minimum
- **Score** = how many rules pass. 3/3 = full match. Each rule also returns a sentence like "Only in Gauteng".
- `GET /opportunities/matches`:
  1. gets every open opportunity, sorted by closing date;
  2. scores each one;
  3. keeps scores of 3 and 2, highest first;
  4. counts the 3s, giving "4 opportunities match your profile" for the demo profile (Crop production, Limpopo, Diploma).
- **Open** means status is active and the closing date is today or later. Expired ones never show.
- `GET /opportunities` (Browse) adds a filter to the SQL for each choice: words, type, province, field, closing in 7 days.

**Likely questions**
| Question | Answer |
|---|---|
| How does matching work? | Three yes/no checks; the score is how many pass. It's in `matching.ts`, about 20 lines. |
| Why not AI matching? | The brief asks that matching can be explained to the user. Three visible rules can be; a model can't. |
| Why does a 2/3 match still show? | It's a close match, and the app shows exactly which check failed, so the user can decide. |
| Why does Limpopo also show national ones? | People in Limpopo can apply for national opportunities too. |
| How do things close? | Automatically after the closing date (the open rule), or early when an admin presses Expire. |

---

## Part 3: Saving, alerts, applying and admin

**Files:** `backend/src/routes/opportunities.ts` (save, calendar, apply), `routes/me.ts`, `routes/admin.ts`

**What happens:**
- **Save** (`POST /opportunities/:id/save` with `daysBefore` 1, 3 or 7) adds a row to `saved_opportunities` and a row to `alerts` with `remind_on = closing date − daysBefore`.
- **Alerts** (`GET /me/alerts`): an alert is **due** when today ≥ `remind_on` and the opportunity is still open. The app shows due alerts as a red banner.
- **Calendar file** (`.ics`): a standard calendar event on the closing date with a reminder before it. The phone's calendar can remind you even when the app is closed.
- **Apply**: if the opportunity has a website, the app opens it. If not, a short form saves a row in `applications`, one per person.
- **Admin**: create, edit (only the fields sent change; we merge, then check the whole thing), expire, and see stats.

**Likely questions**
| Question | Answer |
|---|---|
| How does the alert know when to fire? | `remind_on` is calculated when you save. Each time the app opens, the API returns alerts whose date has arrived. |
| Why not push notifications? | The brief marks them as a stretch goal. The calendar file gives a real phone reminder without them. |
| What if an admin changes the closing date? | We move every alert date with it (one UPDATE in `admin.ts`). |
| Can someone apply twice? | No. The API checks first, and the database has a unique rule on (user, opportunity). |
| Why link out instead of hosting applications? | Organisations already have their own systems. See the design note on working with national platforms. |

---

## Part 4: The mobile app

**Files:** `app/src/app/(tabs)/index.tsx` (Matches), `browse.tsx`, `saved.tsx`, `profile.tsx`, `manage.tsx`, `app/src/app/opportunity/[id].tsx`, `app/src/lib/api.ts`, `lib/auth.tsx`, `lib/offline.ts`, `components/`

**What happens:**
- **Expo Router:** every file in `src/app/` is a screen; the folder name is the URL. `(tabs)/_layout.tsx` creates the bottom tabs, and which tabs show depends on the role.
- `lib/api.ts`: one function `api('/path')` for every server call. It adds the saved token and turns errors into readable messages.
- `lib/auth.tsx`: remembers who is signed in. The token is kept in **SecureStore** (the phone's encrypted storage).
- Each screen follows the same pattern: `useState` for data, load from the API when the screen opens, then show a list or form.
- **Offline:** the Saved tab stores a copy of the list on the phone (`lib/offline.ts`). With no signal, it shows that copy with an "Offline" banner.
- **Builds:** `eas.json` has three profiles: `development` (dev build), `preview` (the public APK) and `production`.

**Likely questions**
| Question | Answer |
|---|---|
| Why React Native with Expo? | One TypeScript codebase for Android (and iOS later), and EAS builds the APK in the cloud. |
| How does the app know the server address? | `EXPO_PUBLIC_API_URL` in `eas.json` (it's shown in the Profile footer). |
| Where is the token kept? | SecureStore, the phone's encrypted storage, not plain storage. |
| How does offline work? | After every successful load the Saved list is copied to the phone; with no signal we show the copy. |
| How do you keep data use low? | No images, short lists, and the dropdown lists are built into the app. |

---

## Where the opportunities come from

`backend/src/db/seed.ts` holds the starting data: 35 invented demo opportunities (every province has a learnership and a job or graduate placement) and 7 real ones copied from official pages on 12 Nov 2026. Every time the server starts (`index.ts`), it adds any that are missing and moves the demo closing dates forward, so the demo never goes stale. Real ones keep their real dates and close by themselves.

| Question | Answer |
|---|---|
| Is the data real? | Both. Invented demo listings let us test every province; 7 real listings link to the official adverts. All people are invented. |
| What happens when a real one closes? | The open rule hides it after its closing date, like any other opportunity. |

## How we know it works

- `cd backend && npm test` runs **42 automated tests** against a real database, including the whole golden journey.
- **Postman:** 51 API test cases (`postman/`), all passing; the report is `docs/API_Test_Cases.pdf`.
- `npx tsc --noEmit` in both folders: no type errors.
