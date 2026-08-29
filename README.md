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
4. Watch the Dashboard for your XP level, weekly activity and streak.

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

Three companions live outside the lessons:

- **Calculator** — full expression evaluator (via [mathjs](https://mathjs.org)) with a session history you can tap to revisit or re-run.
- **Function Graphs** — plot `y = f(x)` on an interactive [Plotly](https://plotly.com/javascript/) chart, with quick examples like `x²`, `sin(x)` and `log(x)`.
- **Delta Calculator** — type `ax²+bx+c` and get a full worked solution: discriminant Δ, roots (including complex ones) and a parabola graph with the vertex marked.

## Progress & gamification

- **XP and levels** — every correct answer earns XP that scales with the question's difficulty (Easy 10 → Master 80 per question).
- **Streaks** — a flame in the sidebar shows your current run; the Dashboard card shows the last 7 days and your all-time best. The fire stays lit on every day you solved at least one task.
- **Per-lesson dots** — complete 15 answers of a lesson to mark it done in the chapter list and the Chapters tab.
- **Stats** — total tasks, accuracy, XP and today's count on the Dashboard.

## Getting started

Requirements: [Node.js](https://nodejs.org) 18+.

```bash
# install dependencies
npm install

# run in the browser only (faster during development)
npm run dev            # opens http://localhost:5173

# build and launch as a desktop app
npm run electron:dev

# production build (output goes to dist/)
npm run build
npm start              # launch Electron using an existing build
```

> `npm run dev` runs just Vite, so the Electron shell (and file persistence via IPC) is not active — useful for quick UI iteration. Use `npm run electron:dev` for the full app.

## Data & privacy

Progress is saved locally to:

```
<platform user-data>/mathink-data/appdata.json
```

(on Windows that is `%APPDATA%\mathink\mathink-data\appdata.json`).

It holds your profile, every task result and the calculator history. Use **Settings → Reset All Data** to wipe it (two clicks to confirm — no recovery after that).

## Project structure

```
.
├─ electron/
│  ├─ main.js        # window, persistent JSON store (IPC)
│  └─ preload.js     # safe bridge: loadData / saveData / resetData
├─ src/
│  ├─ data.ts        # chapters, lesson content, task generators
│  ├─ components/    # Dashboard, Lessons, Chapter, Tasks, Tools, Settings
│  └─ App.tsx        # state, routing, persistence wiring
├─ task_ideas.txt    # internal bank of task-type ideas
└─ package.json
```

## Tech stack

- [Electron](https://www.electronjs.org) — desktop shell
- [React 18](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev) — bundler
- [mathjs](https://mathjs.org) — expression evaluation
- [plotly.js](https://plotly.com/javascript/) — interactive graphs

## License

ISC