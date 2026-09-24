# Junior Mode

Repository structure and development commands: [README.md](README.md). Desktop/platform boundaries: [ADR 0003](docs/adr/0003-separate-desktop-client-from-learning-platform.md).

## Applications

- `apps/learning-platform` — Laravel learning platform, including its React/Inertia UI. Read its `AGENTS.md` before working there. Run Composer, Artisan, and platform pnpm commands from that directory.
- `apps/backend` — shared local Node backend that communicates with the learning platform over HTTP and owns the Codex app-server child process. See [ADR 0004](docs/adr/0004-run-codex-through-the-local-backend.md).
- `apps/web` — independent React frontend with browser and desktop transports.
- `apps/desktop` — Electron shell and restricted IPC bridge to the local backend.

Run workspace commands from the repository root: `pnpm dev`, `pnpm check`, and `pnpm pack:desktop`. All four applications share `pnpm-workspace.yaml` and `pnpm-lock.yaml`. Composer still manages PHP dependencies in `apps/learning-platform`. Use `pnpm dev:client` or `pnpm dev:platform` to run only one side.

## Shared context

- Domain vocabulary and decisions: `CONTEXT.md` and `docs/adr`.
- Domain documentation guidance: `docs/agents/domain.md`.
- Issue tracker conventions: `docs/agents/issue-tracker.md`.
- Agent-facing coaching plugin: `plugins/junior-mode`.
