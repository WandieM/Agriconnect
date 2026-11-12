# AgriOpportunity — 4-minute system presentation (script)

**Length:** about 4:00 (brief: 3–5 min). Screen-record the phone (Android screen recorder, or `scrcpy --record demo.mp4`) and talk over it. Before recording: open `/api/v1/health` to wake the server, and reseed if the demo data is old (the seeded crop internship should say "Closes in 2 days").

| Time | On screen | Say |
|---|---|---|
| 0:00–0:20 | Welcome screen | "This is AgriOpportunity, product A4 of AgriConnect 360. Agricultural bursaries, internships and jobs are scattered, and young people with little data miss them. Our app shows what you qualify for and reminds you before it closes." |
| 0:20–0:45 | Architecture diagram (`docs/architecture.png`) | "It's a React Native app built with Expo, a Node.js and TypeScript API, and PostgreSQL on Render. The app only talks to the API, and the API scores each opportunity with three simple checks." |
| 0:45–1:15 | Register a new account → set profile: Crop production, Limpopo, Diploma | "A new user answers three questions: field, province and highest qualification." |
| 1:15–1:50 | Matches screen → open the top match | "Straight away: three opportunities match your profile. Each one shows why. Here all three checks pass: field, province and qualification." |
| 1:50–2:10 | Open a 2/3 match | "Close matches show the gap, for example 'Needs agricultural engineering', so nobody wastes time applying for something they can't get." |
| 2:10–2:45 | Crop internship → pick 3 days → Save → back to Matches (red alert) → Saved tab | "I save this internship with a reminder three days before it closes. It closes in two days, so the alert is already due. That's our golden journey: profile, matches, save, closing-date alert. The saved list also works offline." |
| 2:45–3:05 | Add to my phone calendar; Apply now → form | "The reminder can go into the phone calendar too. Apply takes you to the organisation's own website, or to a short form for small programmes." |
| 3:05–3:35 | Sign in as admin → Manage → Add opportunity → Expire | "Admins add, edit and expire opportunities. They also close by themselves after the closing date." |
| 3:35–3:50 | `docs/Design_Note.md` | "We don't compete with national youth platforms. Apply buttons send people back to the original site, our listings API is public, and the next step is importing their listings automatically." |
| 3:50–4:00 | Postman runner (51/51 green) | "51 Postman test cases and 40 integration tests pass, and the APK is public through EAS. Thank you." |

**Checklist:** API URL correct in the APK (Profile footer) · notifications muted · normal font size · test the mic.
