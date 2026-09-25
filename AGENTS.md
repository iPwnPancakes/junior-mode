# Junior Mode

Repository structure and development commands: [README.md](README.md). Desktop/platform boundaries: [ADR 0003](docs/adr/0003-separate-desktop-client-from-learning-platform.md).

## Applications

- `apps/learning-platform` — Laravel learning platform, including its React/Inertia UI. Read its `AGENTS.md` before working there. Run Composer, Artisan, and platform pnpm commands from that directory.
- `apps/backend` — shared local Node backend that communicates with the learning platform over HTTP and owns the Codex app-server child process. See [ADR 0004](docs/adr/0004-run-codex-through-the-local-backend.md).
- `apps/web` — independent React frontend with browser and desktop transports.
- `apps/desktop` — Electron shell and restricted IPC bridge to the local backend.

Run workspace commands from the repository root: `pnpm dev`, `pnpm check`, and `pnpm pack:desktop`. All four applications share `pnpm-workspace.yaml` and `pnpm-lock.yaml`. Composer still manages PHP dependencies in `apps/learning-platform`. Use `pnpm dev:client` or `pnpm dev:platform` to run only one side.

## Shared client preview

- Use `pnpm preview status` to identify the worktree serving the shared remote Electron preview.
- When the user asks to see changes, run `pnpm preview use` from the intended worktree, then verify it reports ready. The default URL keeps port 5174 across switches.
- Use `pnpm preview logs` for startup/runtime failures and `pnpm preview stop` to stop the managed client. These commands share ownership across this repository's Git worktrees.
- Do not kill arbitrary port listeners. The manager refuses unmanaged processes; identify their command and worktree before deliberately migrating an existing manual dev server.
- Switching restarts the preview's browser backend and interrupts its active work. Electron's local backend is separate. Reload Electron after switching worktrees; subsequent frontend edits use HMR.
- Platform services remain separate. See README's shared preview section for ports, host overrides, and stale-lock recovery.

## Shared context

- Domain vocabulary and decisions: `CONTEXT.md` and `docs/adr`.
- Domain documentation guidance: `docs/agents/domain.md`.
- Issue tracker conventions: `docs/agents/issue-tracker.md`.
- Agent-facing coaching plugin: `plugins/junior-mode`.
