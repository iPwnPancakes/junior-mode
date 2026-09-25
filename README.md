# Junior Mode

Junior Mode combines a Laravel learning platform, a separate Electron client, and an agent-facing coaching plugin. The desktop client has its own React frontend and local Node backend. The architecture is recorded in [ADR 0003](docs/adr/0003-separate-desktop-client-from-learning-platform.md).

## Repository structure

```text
apps/
├── learning-platform/   Laravel application and its React/Inertia website
│   ├── app/            Domain logic, controllers, and services
│   ├── resources/      Platform React UI, styles, and Blade templates
│   ├── routes/         Website, API, and platform integration routes
│   ├── database/       Migrations, factories, and seeders
│   ├── tests/          PHP and platform feature tests
│   ├── composer.json   PHP dependencies and platform checks
│   └── package.json    Platform frontend dependencies and scripts
├── backend/            Shared local Node service and browser HTTP adapter
├── web/                Independent React client and transport selection
├── desktop/            Electron main process, preload bridge, and packaging
├── scripts/            Client development runner and Electron setup
└── tests/              Electron integration tests
docs/
├── adr/                Architectural decisions
├── agents/             Repository workflow guidance
└── product-requirements.md
plugins/junior-mode/     Agent-facing coaching plugin
package.json            Root development, build, and check commands
pnpm-workspace.yaml     All four applications as JavaScript workspaces
pnpm-lock.yaml          Shared JavaScript dependency lockfile
CONTEXT.md              Shared domain vocabulary
```

Laravel also keeps its environment files, storage, public assets, build configuration, agent tooling, and installed dependencies inside `apps/learning-platform`. Its design system is documented in [apps/learning-platform/docs/design-system.md](apps/learning-platform/docs/design-system.md).

Use **pnpm from the repository root** for all JavaScript dependencies and development commands. Each application keeps its own `package.json`; shared local dependencies use `workspace:*`. Composer manages PHP separately inside `apps/learning-platform`. A workspace is a development boundary, not a runtime dependency: the desktop application still communicates with Laravel over HTTP.

## Local development

Use PHP 8.5, Composer 2, and Node 24 for the full stack. Desktop development also requires a graphical environment and Electron's operating-system runtime dependencies.

On a fresh checkout, run from the repository root:

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm setup:platform
pnpm dev
```

The root `packageManager` field pins pnpm 11.25.0. If your Node installation does not include Corepack, install that pnpm version using the [pnpm installation guide](https://pnpm.io/installation).

`setup:platform` runs Composer setup: installs PHP dependencies, initializes Laravel's environment and application key, migrates the database, and builds the platform website. Use it for initial setup; it regenerates the application key. Normal daily development only needs `pnpm dev`.

| Root command | What it runs |
| --- | --- |
| `pnpm dev` | Full stack: Laravel, queue listener, platform Vite, client Vite, Node backend |
| `pnpm dev:client` | Client Vite and Node backend; connect to an existing Laravel instance |
| `pnpm dev:platform` | Laravel, queue listener, and platform Vite |
| `pnpm dev:desktop --url=http://localhost:5174` | Electron using the running client frontend |
| `pnpm check` | Client checks and the platform's complete CI checks |
| `pnpm build` | Both frontend production builds |

Open `http://localhost:5174` for the new client or `http://localhost:8000` for the learning platform. In Settings → Learning platform, enter `http://localhost:8000` as the platform address. This checks compatibility and availability. In Coaching authorization, name this client, open the approval page in your browser, sign in as a Learner, approve the displayed code, and select **I approved this client**. Codex login remains separate.

| Process | Default address | Responsibility |
| --- | --- | --- |
| Laravel | `127.0.0.1:8000` | Platform website and API |
| Platform Vite | `127.0.0.1:5173` | Platform website assets and hot reload |
| Client Vite | `127.0.0.1:5174` | New client UI, hot reload, and `/api` proxy |
| Client Node backend | `127.0.0.1:4318` | Browser transport and platform HTTP calls |

Optional client development settings stay in [apps/.env.example](apps/.env.example); copy it to `apps/.env` to customize client ports or the reverse-proxy hostname. Laravel uses its own `apps/learning-platform/.env`. Ctrl-C stops the development processes together.

To target one workspace or add a dependency:

```bash
pnpm --filter @junior-mode/web typecheck
pnpm --filter @junior-mode/web add some-package
pnpm --filter @junior-mode/learning-platform run test:components
composer --working-dir=apps/learning-platform require vendor/package
```

Commit the root `pnpm-lock.yaml` with JavaScript dependency changes. Do not run npm install or create per-app lockfiles. When switching an existing npm checkout, remove its old `apps/node_modules` and app-level `node_modules` directories before installing with pnpm. PHP dependencies remain locked by the platform's `composer.lock`.

## Desktop and browser UI components

The shared React frontend in `apps/web` uses [shadcn/ui](https://ui.shadcn.com/docs/installation/vite),
Radix primitives, Lucide icons, and Tailwind CSS v4. Electron renders this same
frontend. UI components live in `apps/web/src/components/ui`; `components.json`
configures the registry and `@/` import alias. Theme tokens live in `src/ui.css`;
`src/style.css` contains app-specific layout styles.

Prefer the existing shadcn components for controls and interactions. Add more
from the repository root with `pnpm dlx shadcn@latest add <component> -c apps/web`.
The project picker composes Dialog, Command, Checkbox, and Button; folder
enumeration still comes from the active backend host.

Run `pnpm exec playwright install chromium` once, then `pnpm test:web` for
browser interaction tests. They launch an isolated Vite server and mock backend
responses, leaving the shared preview and real chats untouched.

## Shared client preview across worktrees

Use the preview manager on your Linux or macOS development server when Electron
loads its frontend remotely:

```bash
pnpm preview status
pnpm preview use
pnpm preview logs
pnpm preview stop
```

Run `preview use` from the worktree you want to see. It starts a background
`dev:client`, or stops the managed preview and switches to that worktree. It waits
for Vite and the backend to respond before reporting ready. Running it again for
the same healthy worktree does nothing. Electron keeps the same URL; reload it
after a worktree switch. Frontend edits within the selected worktree use Vite HMR.

The default web/backend ports are 5174/4318, with Vite listening on `0.0.0.0`
for LAN/VPN access. The backend stays on loopback. Use this only on a trusted
development network, as with `dev:client --host 0.0.0.0`. Override with
`pnpm preview use --host 127.0.0.1 --web-port 5175 --backend-port 4319`;
subsequent switches preserve the running preview's host and ports.
The manager's explicit settings take precedence over port/host settings in
`apps/.env`. Platform services are managed separately with `pnpm dev:platform`.

All worktrees of the same Git checkout share one registry and log in
`$(git rev-parse --git-common-dir)/junior-preview`. Status reports the owning
worktree, branch at startup, URL, supervisor PID, and health. Logs prints the last
100 lines from the current/latest instance. Switching replaces that log.
Stopping a browser backend interrupts its active work; Electron's local backend
is a separate process and is not stopped by this manager.

Only the authenticated supervisor can stop its own process group. If a port
belongs to a manually started server or another checkout, `use` reports the
conflict without killing it. Stop that server in its original terminal once,
then run `preview use`. A stale registry can be replaced when its ports are free.
Concurrent switching is locked; if a command is forcibly killed while holding
the lock, confirm no preview command is running before removing the reported
lock directory. Windows can continue using foreground `pnpm dev:client`.

## Electron development

From the repository root, after `pnpm install --frozen-lockfile`:

```bash
pnpm setup:desktop
pnpm dev:desktop --url=http://localhost:5174
```

The first command installs Electron's binary explicitly because dependency lifecycle scripts are disabled. The second loads the running Vite frontend while using the **local Electron main process** as its backend. The standalone browser backend is not used by Electron.

To run with bundled frontend assets instead:

```bash
pnpm build:client
pnpm dev:desktop
```

The frontend build goes to `apps/desktop/renderer`. `pnpm pack:desktop` builds an unpacked desktop application; `pnpm build:desktop` creates the configured installer for the build machine's platform. Outputs go to `apps/desktop/dist`. Packaged builds always use bundled assets and ignore the development URL override. PHP and Laravel are not included in these artifacts.

## Preview from another machine

For direct LAN or VPN access without an SSH tunnel, start the stack on t3:

```bash
pnpm run dev --host 0.0.0.0
```

Open `http://T3_IP:5174` in your browser. Or, from your local checkout, launch Electron:

```bash
pnpm dev:desktop --url=http://T3_IP:5174
```

In Settings → Learning platform, connect to `http://T3_IP:8000`. Use the server's reachable IP, not `0.0.0.0` (which is only the listening address). The client UI and Laravel listen on the chosen interface; the Node backend remains on `127.0.0.1:4318` behind Vite's proxy. Electron continues to run Codex locally.

`--host=0.0.0.0` also works. Set `DEV_HOST` in `apps/.env` to make it your default; the command-line flag takes precedence. Without either, the stack still binds to loopback. To use the Laravel website's own hot-reloaded UI on port 8000, use `--host T3_IP` so its Vite asset URLs advertise a reachable address, and allow port 5173 too.

Direct HTTP is intended for trusted networks. Restrict access with your network/firewall: the development preview exposes Codex capabilities without login. No firewall rules are changed by this command.

Alternatively, keep loopback binding and use SSH forwarding:

On the t3 server, run `pnpm run dev` from the repository root. On your own machine, forward the client web port:

```bash
ssh -N -L 5174:127.0.0.1:5174 t3code@YOUR_SERVER
```

Open `http://localhost:5174` in your browser. Only this port is needed: Vite proxies API requests to the Node backend on the server. The backend can reach Laravel at `http://localhost:8000` on that server.

For a local Electron window displaying the remote frontend, also forward Laravel if it runs remotely:

```bash
ssh -N -L 5174:127.0.0.1:5174 -L 8000:127.0.0.1:8000 t3code@YOUR_SERVER
```

Keep that tunnel running. In a checkout on your own machine, run from the repository root:

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm setup:desktop
pnpm dev:desktop --url=http://localhost:5174
```

In Electron’s Learning platform tab, connect to `http://localhost:8000`. Your machine only needs Node/pnpm and Electron's operating-system dependencies; PHP and the database stay on t3. In this mode, the frontend assets come from the server, but platform requests originate in Electron on your machine. The extra tunnel makes Laravel reachable there. If Laravel already runs locally, omit the second forwarding rule. Local Electron shell/backend changes (including new folder-picker capabilities) require updating the local checkout and restarting Electron; frontend edits hot-reload from the remote Vite server.

## Codex chats

The chat workspace runs Codex against repositories on the machine hosting the backend. In Electron this is your own computer, even when the UI loads from remote Vite. Browser preview runs Codex on the preview server and identifies that host when adding a project.

Install [Codex CLI](https://learn.chatgpt.com/docs/cli) on that machine, then sign in:

```bash
codex login
```

Electron starts Codex automatically on boot. Use **Settings → Providers** in the bottom sidebar to inspect its account/status or reconnect after CLI sign-in. In browser preview, connect there manually.

Use the **folder-plus icon** beside **Search** to open the project picker without leaving your chat. Type a path (including `~/`) to see live folder suggestions; use the arrow keys and Enter/Tab to open folders. Select **Add project** or press **Ctrl/Cmd+Enter** to use the current folder. A missing folder changes the action to **Create & add project**, explicitly creating it before adding the project. Escape closes the picker and returns focus to the sidebar. Home, parent-folder navigation, and hidden folders are available. It browses the backend host: your computer in Electron, or the preview server in a browser.

Projects remain available through the **folder icon**, even before their first chat. Choose a project there to open a scoped draft; the **New chat** icon keeps the current project. The sidebar shows a flat list of chat cards with project labels, relative timestamps, and repository paths. Search matches project names, paths, and chat titles. Adding the same folder (including a symbolic link to it) reuses its project. Adding a project does not enroll the repository or start Codex.

Messages stream into the chat, commands and file changes appear as expandable activity, and **Stop** interrupts an active turn. Select a saved chat under its project to resume it after restarting. One turn runs at a time in each Junior Mode backend.

Junior Mode launches `codex app-server` as a child process and uses its JSON-RPC stdio protocol. It uses the existing Codex login and configured model/provider. The protocol was checked against Codex CLI 0.155.1. If the executable is not on PATH, set `JUNIOR_CODEX_PATH` to its absolute path in the environment launching Electron or the browser backend. GUI launches also search `~/.local/bin`, `/opt/homebrew/bin`, and `/usr/local/bin`.

Threads use Codex's `workspace-write` sandbox and `on-request` approval policy, with approvals routed to the user. Command/file approval requests and questions appear in the chat. Unsupported request types return an explicit error; the app never silently grants them. Codex manages its own transcripts; Junior Mode stores a versioned index of projects, chat IDs, and project associations in the local SQLite database alongside its connection settings. Flat indexes from older releases migrate automatically by repository path, preserving chat IDs and missing-folder history. Projects and transcripts remain on the backend machine; renderer storage is not used. It does not list unrelated Codex sessions.

New chats in the app always enable coaching and connect their managed Codex thread to the platform MCP; there is no per-chat opt-in. The backend resolves the origin Git remote against the authenticated Learner’s enrollments before starting and before each turn. Unknown repositories, revoked authorization, or an unavailable platform block chat startup rather than falling back to a plain chat. Previously saved plain chats retain their original behavior when resumed. In **Settings → Learning platform**, choose **Install coaching plugin** once before starting your first coaching chat. This uses the installed Codex CLI to install the bundled version into its plugin cache and register only `junior-mode@junior-mode-desktop`; unrelated Codex settings are preserved. Reinstall after a Junior Mode update. Managed plain chats disable this plugin and MCP server; coaching chats load its installed Junior Mode skill explicitly on each turn, including after resume. The backend supplies authenticated MCP transport separately to avoid a duplicate plugin server. Starting a chat still does not create a Coaching Session until the skill finds a relevant objective and the platform accepts its startup call.

This is the chat foundation, with CLI-based sign-in and plain-text transcripts. It does not yet implement model selection, attachments, or remote repository selection inside Electron. Opening a Codex chat does not enroll a repository or create a Coaching Session. See [ADR 0004](docs/adr/0004-run-codex-through-the-local-backend.md).

## State and verification

Laravel owns the learning records and account data. The local backend stores application settings, plugin metadata, projects, chat metadata, and platform credentials in **`junior-mode.sqlite`** using Node’s built-in SQLite driver (Node 22.13+; Node 24 recommended). Tables use a versioned schema, foreign keys, WAL journaling, and transactions for project/chat updates.

- **Electron:** `junior-mode.sqlite` under `app.getPath('userData')`, the OS-standard per-user app directory. Development and packaged app names can have different directories; existing Electron data stays in its current directory.
- **Browser backend on Linux:** `$XDG_DATA_HOME/junior-mode/browser/junior-mode.sqlite`, defaulting to `~/.local/share/junior-mode/browser/junior-mode.sqlite`.
- **Browser backend on macOS:** `~/Library/Application Support/Junior Mode/browser/junior-mode.sqlite`.
- **Browser backend on Windows:** `%LOCALAPPDATA%\Junior Mode\browser\junior-mode.sqlite`.

Set `JUNIOR_DATA_DIR` to an absolute directory to override browser-backend storage. The old `JUNIOR_SETTINGS_PATH` override remains supported: its parent directory receives the database and supplies legacy files. Browser and desktop storage are separate because they own different local repositories. Browser storage is now independent of the active checkout.

On first launch, the backend transactionally imports `connection.json`, `coaching-plugin.json`, `codex-chats.json` (flat or versioned), and `platform-credentials.json`. Electron imports from its app directory; browser preview imports from the current checkout’s `apps/.local` directory, or the legacy override. Original files remain untouched as backups. A migration marker prevents old files from restoring deleted settings or disconnected credentials. Malformed imports fail without committing partial data and can be retried after repairing the original file.

The database has owner-only file permissions. Electron credentials remain encrypted with OS-backed `safeStorage` inside a BLOB; secure storage must be available before new credentials can be saved. Browser credentials are stored unencrypted in the private database on the preview host. SQLite does not replace OS credential encryption. Back up the database with a SQLite-aware tool while running, or copy it after stopping the app so WAL writes have been checkpointed.

Disconnect removes the credential from the active database and stops its Codex connection; revoke the named client on the platform to invalidate it server-side. Legacy backup files remain unchanged. The renderer receives only authorization status, names, and the short-lived browser approval link. Process-scoped Codex overrides and environment variables configure `/mcp`; no global Codex configuration is written.

Run checks from the repository root:

```bash
pnpm check
pnpm build
pnpm setup:desktop
pnpm test:electron
```

Use `pnpm check:client` or `pnpm check:platform` for focused checks. Platform checks include PHP tests, PHPStan, Pint, frontend lint/format/types, and component tests. `pnpm build:client` builds only the new frontend and needs no PHP; `pnpm build:platform` builds the Laravel website and requires its Composer dependencies.

The packaged Electron app ships the same plugin and marketplace under `resources/coaching-marketplace`, outside `app.asar` so the local Codex CLI can read them even when frontend assets come from remote Vite. Browser preview installs on its backend host. The package also retains the existing Mentor Mode skill; installing it does not grant Mentor authority.

With PHP dependencies and Codex CLI installed, `JUNIOR_TEST_REAL_CODEX=1 node --test apps/tests/coaching-platform.test.mjs` tests the real managed Codex-to-Laravel MCP path against a temporary SQLite database. It checks identity, enrollment, and Coaching Brief retrieval without a model turn. `JUNIOR_TEST_REAL_CODEX=1 node --test apps/tests/plugin-install.test.mjs` checks real CLI installation in an isolated Codex home and uses a local model fixture to verify exact skill prompt assembly for coaching, and its absence in ordinary chats. Set `JUNIOR_TEST_MARKETPLACE_ROOT` to the packaged `resources/coaching-marketplace` directory to test packaged assets. These are transport tests, not behavioral or pilot results.

`JUNIOR_TEST_PRODUCTION_PLATFORM=1 node --test apps/tests/production-platform.test.mjs` performs an isolated `composer install --no-dev` and verifies the MCP route returns an authentication challenge. `laravel/mcp` is a direct production dependency. Behavioral evaluation inputs and observed dry-run responses live beside the [Junior Mode skill](plugins/junior-mode/skills/junior-mode/SKILL.md), with [evaluation scope and limitations](plugins/junior-mode/skills/junior-mode/evals/REPORT.md).

The Electron test requires the binary installed by `setup:desktop`, built frontend assets, and a display. On headless Linux, use `xvfb-run -a pnpm test:electron`. It uses local platform and Codex protocol fixtures to verify the IPC-to-HTTP path, streamed chats, approval/input handling, interruption, and history restoration without making model requests. CI also tests the packaged Linux application; see [.github/workflows/tests.yml](.github/workflows/tests.yml).
