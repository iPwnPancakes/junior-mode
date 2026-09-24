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

Open `http://localhost:5174` for the new client or `http://localhost:8000` for the learning platform. In the client, enter `http://localhost:8000` as the platform address. This checks compatibility and availability; it does not sign you in.

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

Connect to `http://localhost:8000` inside Electron. Your machine only needs Node/pnpm and Electron's operating-system dependencies; PHP and the database stay on t3. In this mode, the frontend assets come from the server, but platform requests originate in Electron on your machine. The extra tunnel makes Laravel reachable there. If Laravel already runs locally, omit the second forwarding rule. Local Electron shell/backend changes require updating the local checkout and restarting Electron; frontend edits hot-reload from the remote Vite server.

## State and verification

Laravel owns the learning records and account data. The browser-preview backend saves its platform address in `apps/.local/connection.json` (overridable with `JUNIOR_SETTINGS_PATH`). Electron saves its address in `connection.json` under Electron's per-user application data directory. These are separate local settings, not copies of the learning database.

Run checks from the repository root:

```bash
pnpm check
pnpm build
pnpm setup:desktop
pnpm test:electron
```

Use `pnpm check:client` or `pnpm check:platform` for focused checks. Platform checks include PHP tests, PHPStan, Pint, frontend lint/format/types, and component tests. `pnpm build:client` builds only the new frontend and needs no PHP; `pnpm build:platform` builds the Laravel website and requires its Composer dependencies.

The Electron test requires the binary installed by `setup:desktop`, built frontend assets, and a display. On headless Linux, use `xvfb-run -a pnpm test:electron`. It starts a test platform fixture and verifies the IPC-to-HTTP path. CI also tests the packaged Linux application; see [.github/workflows/tests.yml](.github/workflows/tests.yml).
