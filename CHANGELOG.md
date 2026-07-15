# Changelog

All notable changes to A.C.E OS are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Keyboard accessibility** for the design system. A new
  side-effect CSS file (`frontend/design-system/src/a11y.css`)
  ships with `@ace/design-system` and applies a `:focus-visible`
  ring (3 px `#3da8ff`, 2 px offset) to every `button`,
  `div[role="button"]`, `input`, `select`, and `textarea`. The
  selector uses `:where(...)` so any per-theme override still
  wins.
- **Reduced-motion opt-out**. A `@media (prefers-reduced-motion:
  reduce)` block in the same CSS file collapses every animation
  and transition to 0.001 ms so the kiosk no longer animates
  press states, palette flips, or toasts for users with
  vestibular motion sensitivity.
- **`aria-current="page"`** on the desktop shell's launcher
  button for the active app, so screen-reader users hear which
  tile corresponds to the currently-open app.

### Changed

- `backend/src/db.ts::safeJson` previously duplicated the default
  `UserPreferences` literal in both fallback branches. The
  fallback is now a single `DEFAULT_PREFERENCES` constant
  exported alongside; the two restore paths can no longer drift.

### Tests

- New `backend/tests/db.test.ts` covers the eight row-mapper
  functions (`rowToTask`, `rowToSubject`, `rowToEvent`,
  `rowToNote`, `rowToSession`, `rowToMessage`,
  `rowToNotification`, `rowToUser`) plus the JSON safety
  helpers (`safeJsonArray`, `safeJson` through `rowToUser`) that
  previously had only integration coverage in `api.test.ts`.

## [2.0.0] - In progress

The v2 --beta release is a full re-code of the codebase for stronger
TypeScript posture, better cold-boot behaviour, and a kiosk-first
touch UX. It lands four touch-first apps, a first-setup wizard, and a
flashable image installer on top of the v1 Settings + AI Tutor + Focus
surface.

### Added

- `@ace/design-system` — touch-first primitives: `TouchButton`,
  `Card`, `IconButton`, `VirtualKeyboard`, `ThemeProvider`, palette,
  and an 8 px spacing scale.
- `@ace/desktop-shell` — single-app Vite + React shell that hosts
  the Setup Wizard and the Dashboard. Manual `manualChunks` for
  per-app dynamic imports.
- `@ace/app-home` — touch-friendly launchpad and today overview.
- `@ace/app-tasks` — touch-managed task lists.
- `@ace/app-focus` — Pomodoro timer.
- `@ace/app-settings` — theme, network, and system actions.
- First-setup wizard: 5 steps (Language, Connectivity, Profile,
  Theme, Done), gated on `GET /api/system/setup-state`.
- `POST /api/system/setup-state` and `POST /api/system/setup-reset`
  routes, with the wizard state persisted to
  `/var/lib/ace/setup.json` (overridable via `ACE_SETUP_FILE`).
- Image installer scripts under `scripts/installer/`:
  - `build-image.sh` — base Raspbian + A.C.E overlay.
  - `flash.sh` — verifies SHA-256, 10 s countdown, `dd bs=4M conv=fsync`.
- Custom Plymouth boot splash (owning the DRM device through
  `initramfs → KMS → X/Wayland → desktop`) so the first ~25 s of
  boot shows the A.C.E wordmark instead of the rainbow square.
- Cross-compiled kernel recipe in `system/linux-config/kernel/`
  (Stage 0 of `later/os/build/Dockerfile`) against `rpi-6.6.y` with
  an A.C.E kconfig overlay.
- Six alternative front-end ports (Native Frontend Ports) — Next.js,
  Rust + Iced, Rust + Slint, C++ + Qt 6, Java + JavaFX, and C +
  GTK4. All target the same JSON API at `/api/health` and
  `/api/users/me`.
- Top-level C-daemon `Makefile` wrapping the per-module trees
  (`make`, `make daemon`, `make focus`, `make test`, `make verify`,
  `make clean`).
- `scripts/install-hooks.sh` — idempotent installer for a pre-commit
  hook that runs `npm run typecheck && npm run test`.

### Changed

- Backend port and configuration standardized on the `ACE_PORT`
  environment variable (default `4318`).
- `npm run verify` extended to include the shells smoke test when
  the backend is reachable; skipped with a warning otherwise.
- `.gitignore` extended to cover `*.o`, `*.a`, `build/`, `dist/`,
  `target/`, `*.db`, `*.db-journal`, `.DS_Store`, `.vscode/`,
  `.idea/`.
- Touch target sizes standardized: `TouchButton` 64 / 80 / 96 px,
  `TouchIconButton` 72 px, launcher tiles 80 px+. Body text floor
  18 px; headings ≥ 24 px.
- App isolation: every `frontend/apps/*` is a separate workspace
  consumed by `desktop-shell` via dynamic `import()`.

### Removed

- "dev log" section of the old README; preserved in `DEVLOG.md`.

### Fixed

- WSOD recovery: kiosk shell reloads after 3 rapid crashes.
- `kiosk.sh` now routes to `?setup=1` when the wizard is pending.

### Known issues

- AI Tutor is a backend service only; the React app entry is
  registered but not shipped in v2 --beta.
- Several v1 errors remain in the historical issue tracker; see
  `DEVLOG.md` for the raw list.
