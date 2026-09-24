# Junior Mode

Repository structure and development commands: [README.md](README.md). Desktop/platform boundaries: [ADR 0003](docs/adr/0003-separate-desktop-client-from-learning-platform.md).

## Applications

- `apps/learning-platform` — Laravel learning platform, including its React/Inertia UI. Read its `AGENTS.md` before working there. Run Composer, Artisan, and platform npm commands from that directory.
- `apps/backend` — shared local Node backend that communicates with the learning platform over HTTP.
- `apps/web` — independent React frontend with browser and desktop transports.
- `apps/desktop` — Electron shell and restricted IPC bridge to the local backend.

Run the Node workspace commands from `apps`: `npm run dev`, `npm test`, `npm run lint`, and `npm run pack:desktop`. The learning platform has its own dependencies and checks; it is not an npm workspace in `apps/package.json`.

## Shared context

- Domain vocabulary and decisions: `CONTEXT.md` and `docs/adr`.
- Domain documentation guidance: `docs/agents/domain.md`.
- Issue tracker conventions: `docs/agents/issue-tracker.md`.
- Agent-facing coaching plugin: `plugins/junior-mode`.
