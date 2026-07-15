# A.C.E OS - Academic Companion Engine OS

A lightweight Linux-based operating system for Raspberry Pi, designed specifically for students. A.C.E OS combines a minimal Linux base with a custom React + TypeScript desktop environment to deliver a complete educational computing experience.

## Architecture

A.C.E OS is built as a tiered system:

```
┌─────────────────────────────────────────────────┐
│         A.C.E React Desktop Environment         │
│  (Apps, UI, Productivity, AI Features)          │
├─────────────────────────────────────────────────┤
│      A.C.E Backend API (Node.js + SQLite)       │
│  (Tasks, Calendar, Settings, Hardware)         │
├─────────────────────────────────────────────────┤
│   A.C.E Hardware Services (Linux Daemons)       │
│  (Camera, GPIO, AI, Sync)                       │
├─────────────────────────────────────────────────┤
│   Linux Base (Raspberry Pi OS Lite ARM64)       │
│  (Drivers, Networking, Storage)                │
└─────────────────────────────────────────────────┘
```

## Project Structure

```
ace-os/
├── frontend/        React + TypeScript desktop & apps
│   ├── desktop-shell/   Main A.C.E interface
│   ├── apps/            Individual applications
│   │   ├── home/        Dashboard
│   │   ├── planner/     Calendar & scheduling
│   │   ├── tasks/       Task management
│   │   ├── subjects/    Learning subjects
│   │   ├── focus/       Pomodoro & study sessions
│   │   ├── ai/          AI learning assistant
│   │   ├── statistics/  Learning analytics
│   │   └── settings/    System configuration
│   └── shared/          Shared types & utilities
├── backend/         Node.js + TypeScript API
│   ├── api/             REST endpoints
│   ├── database/        SQLite layer
│   └── services/        Business logic
├── system/          Linux system configuration
│   ├── linux-config/    OS setup scripts
│   ├── services/        Systemd unit files
│   └── boot/            Boot configuration
└── hardware/        Hardware service code
    ├── camera/          Camera interface
    ├── sensors/         Sensor interfaces
    └── gpio/            GPIO control
```

## Quick Start (Development)

### Prerequisites
- Node.js >= 18
- npm >= 9

### Install
```bash
npm install
```

### Run Development Mode
```bash
# Start backend (terminal 1)
npm run dev:backend

# Start desktop shell (terminal 2)
npm run dev:shell
```

The desktop shell will open at `http://localhost:5173` in Chromium kiosk mode.

### Build for Production
```bash
npm run build
```

## Port shells (alternative front-ends)

A.C.E OS exposes a JSON API from `backend/` on port `4318`. Anything
that can speak `GET /api/health` and `GET /api/users/me` can be a
front-end. Beyond the React/Vite SPA that ships by default
(`frontend/desktop-shell/`), six alternative front-ends live in this
repo:

| Stack      | Path                       | Native on Pi? | Boot speed vs Chromium kiosk |
|------------|----------------------------|---------------|------------------------------|
| Next.js    | `frontend/nextjs/`         | no (still Chromium) | faster FCP, otherwise equivalent |
| Rust+Iced  | `frontend/rust-iced/`      | yes (`iced 0.13` over Wayland/X11) | **~80ms** cold start |
| Rust+Slint | `frontend/rust-slint/`     | yes (Slint renderer) | **~60ms** cold start, smallest binary |
| C++ / Qt 6 | `frontend/cpp-qt/`         | yes (Qt Widgets) | **~150ms** cold start |
| Java + JavaFX | `frontend/java-javafx/` | yes (JDK 17 + OpenJFX) | **~600ms** cold start (JVM warmup) |
| C + GTK4   | `frontend/c-gtk4/`         | yes (Wayland native) | **~50ms** cold start |

Each port has its own `README.md` with prerequisites + a build/run
recipe. To get all six running side-by-side against the same backend:

```bash
npm run dev:backend            # terminal 1
./scripts/dev-all.sh           # terminal 2 (tmux dashboard)
```

Or pick and choose:

```bash
npm run shell:nextjs:dev
npm run shell:rust-iced:check
npm run shell:cpp-qt:build
npm run shell:java-javafx:run
npm run shell:c-gtk4:build && npm run shell:c-gtk4:run
```

`scripts/verify-shells.mjs` (`npm run shells:verify`) is a smoke test
that hits the two shared endpoints and asserts the JSON shape the
shells rely on — useful in CI before kicking off cross-compilation.

### MVP scope (intentionally narrow)

Every port's MVP is a single window with three label rows + a Refresh
button: `Backend:` (`/api/health`), `User:` (`/api/users/me`), plus a
timestamp. None of them reimplements the React dashboard; they exist
to validate end-to-end plumbing (HTTP → parsing → render → click). To
port full features, follow the per-stack READMEs as the entry point.

## Raspberry Pi Deployment

See [`system/linux-config/INSTALL.md`](system/linux-config/INSTALL.md) for full deployment instructions to Raspberry Pi hardware.

## Applications

1. **Home** — Dashboard with today's overview & quick actions
2. **Planner** — Calendar, assignments, exams, timetable
3. **Tasks** — Task management with priorities & categories
4. **Subjects** — Subject list, notes, revision tracking
5. **Focus** — Pomodoro timer & study sessions
6. **AI** — AI learning assistant (Ollama/llama.cpp)
7. **Statistics** — Learning analytics & trends
8. **Settings** — System, theme, hardware, network

## Hardware Services

- **ace-core**: Main OS service & IPC
- **ace-hardware**: Camera, GPIO, sensors, LEDs
- **ace-ai**: Local AI processing
- **ace-sync**: Data backup & syncing

## License

MIT

## dev log |

v1 was pushed at  (15 July 2026 at 15:42)
   initail com is still v1 with json files beng the main change 
Update: v1.01 -- beta was a debug due to an old code file 
Update: v1.01.1 --beta adds files for the raspberry py to control gpio camara sensors ect..
  Note: not being pushed due to bugs
  Note: more erros found in /home/Lihan/A.C.E/frontend/apps/ai/tsconfig.json
  Note: error is [{
	"resource": "/home/Lihan/A.C.E/frontend/apps/ai/tsconfig.json",
	"owner": "typescript",
	"severity": 8,
	"message": "Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '\"ignoreDeprecations\": \"6.0\"' to silence this error.\n  Visit https://aka.ms/ts6 for migration information.",
	"source": "ts",
	"startLineNumber": 3,
	"startColumn": 3,
	"endLineNumber": 3,
	"endColumn": 20,
	"origin": "extHost1"
}]
Note: cant find main error Timestamp Jul15 at 1618 hr 
Note: sorry for using military time as im a cadet and im use to that [nzcf website fpr refrece to cadets](https://cadetforces.org.nz/)

Note: Error found in the ai app folder api error and due to taht no important till later on timestamp 1622 hr
Update: adding settings app and finish codeing gui ran by npm run dev time stamp 1623hr 
Note: 2nd error but not for this project idk how that code got into my codebase timestamp jul 15 1629hr
Update:adding backround folder ato add more background timestamp jul 15 1717 hr
Update: 4 errors ![screenshot](image.png) timestame jul15 17:23
Note using claude for debugging 
Update pushing v1.2.0 --beta with kind of working gui
   Note: this will be the 4th push for this project 
   Note; 5 errors 
Update: timestamp jul 15 1733 hr claude code found the erros but just makeing them worst somehow 
   Note this is what claude code said # Developer Notes #2: Major Errors and Debugging Challenges

During the latest stage of development, I encountered two major errors that have become significant blockers. After spending time investigating the issues, testing possible solutions, and reviewing the code, I have not yet been able to determine the exact cause.

These errors have slowed development progress, but they have also provided useful opportunities to learn more about the system and identify areas that may need improvement. Debugging complex problems is a normal part of software development, even if it sometimes feels like the code has decided to fight back for no logical reason.

At this stage, I may use additional debugging tools, including Claude Code, to help analyse the issues and speed up the troubleshooting process. The goal is not just to find a quick fix, but to understand the underlying cause and make sure the solution is reliable.

Further updates will be added once more information is discovered, including the root cause of the errors, the debugging process, and the final fixes implemented.
Update:
       New push no version update comminted claude code fixis
                                                             Timestamp: jul 1510 hrs  
Update: version 1.2.1 --beta is now being pushed timespame jul 15 1829hr                                                              
Update v1.2.1--beta is a broken vertion not to be used 
update v1.2.2 -- beta is a fix hopefull that is now being pushed 
  Note: ai tutor is broken 
Update: backend fixxes V1.2.3 --beta   is pushed
Note erros are fin and to be ignored at this stage
     Next step is to fix thems and add mreo apps fix light and dark mode and try and make the first iso 
update Next step is to fix thems and add mreo apps fix light and dark mode and try and make the first iso not done yet      
update v1.2.4 --beta is the neweset version 
      Next step is to fix thems and add mreo apps fix light and dark mode and try and make the first iso 
Update starting version2 --beta note fully recodeing codebase for better performance and #typscritsucks   
update started recodeing timestamp jul 15 19 50   
    note next fex pushes will still stay on version 2 till the main gui works 
    