# AGENTS.md — app/

See the root `../AGENTS.md` for project rules. App-specific notes:

- Expo SDK 58. Check https://docs.expo.dev/versions/v58.0.0/ before using any Expo API; do not trust memory.
- Always add packages with `npx expo install <package>`.
- Routes live in `src/app/` (Expo Router). Non-route code goes in `src/components/` and `src/lib/`.
- Tabs come from `expo-router/js-tabs`. Role-based tabs use `href: null` to hide.
- All network calls go through `src/lib/api.ts` (`api<T>()`): it adds the Bearer token from SecureStore and turns errors into `ApiError`.
- Reference lists (fields, levels, provinces, types) come from `useMeta()`; the bundled fallback in `src/lib/meta.tsx` must match the API's `/meta`.
- Use tokens from `src/lib/theme.ts`; keep touch targets ≥ 48 px.
- Never create or edit `android/` or `ios/` by hand. Configure in `app.json` / config plugins.
- Run `npx tsc --noEmit` before declaring a task done.
