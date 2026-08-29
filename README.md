# MaThink

An offline math-learning desktop app. Work through structured chapters, solve bite-sized exercises, unlock harder topics as you improve, and keep a streak going — all without an internet connection or an account.

Built with Electron, React and TypeScript.

---

## Why MaThink

- **Structured, not random.** Content is split into chapters, and each chapter into lessons. Every lesson explains the idea first, then drills it.
- **Adapts to you.** Questions get harder within a test, and harder chapters stay locked until you consistently clear the easier ones.
- **Made for daily practice.** Streaks, XP and per-lesson progress give you a reason to come back tomorrow — no push notifications, no leaderboards, just your own numbers.
- **Private by design.** Everything lives in a single JSON file on your machine. Nothing leaves it.

## Learning flow

1. Finish a lesson's 15-question test to light it up in the chapter view.
2. Reaching 80% accuracy on a difficulty unlocks the next one: **Easy → Medium → Hard → Expert → Master**.
3. Each chapter has a knockout *chapter test* with five difficulty tiers that mirrors your unlocked progress.
4. Missed a few? Use **Review mistakes** on the results screen — it re-runs just the questions you got wrong.
5. Watch the Dashboard for your XP level, weekly activity and streak.

## Chapters

| Chapter | Focus |
| --- | --- |
| **Addition** | Mental and written addition, gaps, estimates, word problems |
| **Subtraction** | Borrowing, finding the missing number, "how many to reach the target" |
| **Multiplication** | Times tables, missing factors, money and area problems |
| **Division** | Sharing, remainders, splitting money, verifying results |
| **Square Roots** | Perfect squares, ordering, which pair is correct |
| **Logarithms** | Log basics, log rules, natural log, solving |
| **Equations** | One-step → multi-step, both sides, spotting the wrong step |
| **Functions** | Linear, quadratic, vertex and roots, log functions, domain |

## Question variety

Questions are generated from a template system, so a test rarely feels repetitive. Types you will meet:

- typed answer and multiple choice
- fill-in-the-gap (`17 + _ = 45`) and hidden digits (`742 − 3?6 = 356`)
- estimating before computing
- word problems (money, temperature, taxi fares, sharing things out)
- spot-the-error (True/False, or correct the wrong result)
- series chains (`25 + 17 → + 34 → ?`)
- build-the-equation from a sentence, pick-the-next-step, and find-the-wrong-step in a student's working
- matching (which pair is correct, which formula has a given slope, which point lies on the graph)

## Tools

Five companions live outside the lessons:

- **Calculator** — full expression evaluator (via [mathjs](https://mathjs.org)) with a session history you can tap to revisit or re-run.
- **Function Graphs** — plot `y = f(x)` on an interactive [Plotly](https://plotly.com/javascript/) chart, with quick examples like `x²`, `sin(x)` and `log(x)`.
- **Delta Calculator** — type `ax²+bx+c` and get a full worked solution: discriminant Δ, roots (including complex ones) and a parabola graph with the vertex marked.
- **Solid Builder (3D)** — pick a solid (cube, cuboid, cylinder, cone, sphere, pyramid, right triangular prism), type its dimensions, and explore an interactive 3D model — drag to rotate, scroll to zoom. MaThink shows volume, surface area and the meaningful angles (apex angle, slant vs. base, space-diagonal angles…). Change the color freely and switch the unit between metres and centimetres. A second mode lets you *sketch* a solid by clicking points on a 3D grid: the app computes the convex hull and reports its volume and surface.
- **2D Shapes** — draw a polygon by placing points on a flat coordinate grid. MaThink instantly computes the area, perimeter, whether it is convex or concave (and if it self-intersects), plus every interior angle listed per vertex. Results are shown in metres or centimetres.

## Progress & gamification

- **XP and levels** — every correct answer earns XP that scales with the question's difficulty (Easy 10 → Master 80 per question). Leveling up triggers a little fanfare (toggleable).
- **Streaks** — a flame in the sidebar shows your current run; the Dashboard card shows the last 7 days and your all-time best. The fire stays lit on every day you solved at least one task.
- **Per-lesson dots** — complete 15 answers of a lesson to mark it done in the chapter list and the Chapters tab.
- **Stats** — total tasks, accuracy, XP and today's count on the Dashboard.
- **Nice-to-haves** — keyboard first: play a lesson with `Enter` to submit a typed answer or `1`–`4` to pick a multiple-choice option. Swap light/dark themes from the sidebar. All preferences are saved locally.

## Getting started

Requirements: [Node.js](https://nodejs.org) 18+.

```bash
# install dependencies
npm install

# run in the browser only (faster during development)
npm run dev            # opens http://localhost:5173

# run automated generator & logic tests
npm test

# build and launch as a desktop app
npm run electron:dev

# production build (output goes to dist/)
npm run build

# package installers with electron-builder
npm run dist           # current platform
npm run dist:win       # Windows NSIS installer
npm run dist:mac       # macOS DMG + ZIP
npm run dist:linux     # Linux AppImage
```

Application icons live in `build/` and can be regenerated with `npm run icons`.

> `npm run dev` runs just Vite, so progress is kept in `localStorage` instead of the Electron file store. Use `npm run electron:dev` for the full app.

## Data & privacy

Progress is saved locally to:

```
<platform user-data>/mathink-data/appdata.json
```

(on Windows that is `%APPDATA%\mathink\mathink-data\appdata.json`).

It holds your profile, every task result, the calculator history and your preferences (theme, sound). Use **Settings → Export progress** to back it up as a JSON file, **Import progress** to restore a backup, or **Reset All Data** (two clicks to confirm — no recovery after that).

## Project structure

```
.
├─ build/            # application icons (icon.png, icon.ico)
├─ electron/
│  ├─ main.js        # window, persistent JSON store, import/export dialogs (IPC)
│  └─ preload.js     # safe bridge: loadData / saveData / resetData / export / import
├─ scripts/          # icon generation, build tooling
├─ src/
│  ├─ data.ts        # chapters, lesson content, task generators, streaks, migration
│  ├─ data.test.ts   # generator & logic tests (npm test)
│  ├─ lib/           # geometry: 2D polygon math + 3D solid meshes & convex hull
│  ├─ lib/geom.test.ts # geometry tests (20 cases)
│  ├─ persistence.ts # Electron IPC + localStorage fallback
│  ├─ utils/         # sound (WebAudio) and confetti helpers
│  ├─ components/    # Dashboard, Lessons, Chapter, Tasks, Tools, Solids, Shapes, Settings
│  └─ App.tsx        # state, routing, persistence wiring
├─ task_ideas.txt    # internal bank of task-type ideas
└─ package.json
```

## Tech stack

- [Electron](https://www.electronjs.org) + [electron-builder](https://www.electron.build) — desktop shell and installers
- [React 18](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev) — bundler (tool screens are code-split and loaded on demand)
- [Vitest](https://vitest.dev) — tests for task generators and progress logic
- [mathjs](https://mathjs.org) — expression evaluation
- [plotly.js](https://plotly.com/javascript/) — interactive graphs

## License

ISC