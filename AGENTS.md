# Junior Mode

Repository structure and development commands: [README.md](README.md). Desktop/platform boundaries: [ADR 0003](docs/adr/0003-separate-desktop-client-from-learning-platform.md).

## Applications

- `apps/learning-platform` — Laravel learning platform, including its React/Inertia UI. Read its `AGENTS.md` before working there. Run Composer, Artisan, and platform pnpm commands from that directory.
- `apps/backend` — shared local Node backend that communicates with the learning platform over HTTP and owns the Codex app-server child process. See [ADR 0004](docs/adr/0004-run-codex-through-the-local-backend.md).
- `apps/web` — independent React frontend with browser and desktop transports.
- `apps/desktop` — Electron shell and restricted IPC bridge to the local backend.

Run workspace commands from the repository root: `pnpm dev`, `pnpm check`, and `pnpm pack:desktop`. All four applications share `pnpm-workspace.yaml` and `pnpm-lock.yaml`. Composer still manages PHP dependencies in `apps/learning-platform`. Use `pnpm dev:client` or `pnpm dev:platform` to run only one side.

## Client UI

The Electron/browser frontend in `apps/web` uses shadcn/ui. Reuse components from
`src/components/ui` for controls, menus, popovers, and tabs. Add registry components
with `pnpm dlx shadcn@latest add <component> -c apps/web` from the repository root.
Use theme tokens in `src/ui.css`; keep application layout in `src/style.css`.
Avoid global control styles that override component hover, focus, or disabled
states. Interactive hover, selected, and active fills must use
`bg-highlighted` with `text-highlighted-foreground` (or the corresponding CSS
variables). Define colors only in `src/ui.css`, with light defaults and
`:root.dark` overrides. Apply dark mode to the document root so portals inherit
it. The shadcn `accent` tokens alias these highlights for new registry components.
Do not add pale accent fills, opacity-reduced highlight backgrounds, or local
color overrides. Keep shared Button, Tabs, and Command defaults authoritative.
Run `pnpm test:web` for browser interaction changes (install Chromium with
`pnpm exec playwright install chromium` if needed).

## Shared client preview

- Use `pnpm preview status` to identify the worktree serving the shared remote Electron preview.
- When the user asks to see changes, run `pnpm preview use` from the intended worktree, then verify it reports ready. The default URL keeps port 5174 across switches.
- Use `pnpm preview logs` for startup/runtime failures and `pnpm preview stop` to stop the managed client. These commands share ownership across this repository's Git worktrees.
- Do not kill arbitrary port listeners. The manager refuses unmanaged processes; identify their command and worktree before deliberately migrating an existing manual dev server.
- Switching restarts the preview's browser backend and interrupts its active work. Electron's local backend is separate. Reload Electron after switching worktrees; subsequent frontend edits use HMR.
- Platform services remain separate. See README's shared preview section for ports, host overrides, and stale-lock recovery.

## Exposing preview environments

The development server is reached by its hostname, `t3code` (user `t3code`). Never
suggest or configure SSH port forwarding for this project; expose services on all
interfaces and hand out `http://t3code:<port>` URLs instead.

- Client preview: `pnpm preview use` already listens on `0.0.0.0`. Share `http://t3code:5174`.
- Learning platform: run `pnpm dev:platform --host 0.0.0.0` from the worktree being previewed. Share `http://t3code:8000`; in the client, connect Settings → Learning platform to that same address. Laravel's Vite on port 5173 then advertises `t3code` for assets and hot reload.
- Do not pass `--host t3code`: the name resolves to loopback (`127.0.1.1`) on the server itself, so nothing outside can connect.
- The platform is not managed by `pnpm preview`. Before starting it, check for an existing `dev.mjs --platform` process and which worktree owns it; run only one at a time because ports 8000 and 5173 are fixed.

## Shared context

- Domain vocabulary and decisions: `CONTEXT.md` and `docs/adr`.
- Domain documentation guidance: `docs/agents/domain.md`.
- Issue tracker conventions: `docs/agents/issue-tracker.md`.
- Agent-facing coaching plugin: `plugins/junior-mode`.
