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
├── tests/              Electron integration tests
└── package.json        Node workspaces and client development commands
docs/
├── adr/                Architectural decisions
├── agents/             Repository workflow guidance
└── product-requirements.md
plugins/junior-mode/     Agent-facing coaching plugin
CONTEXT.md              Shared domain vocabulary
```

Laravel also keeps its environment files, storage, public assets, build configuration, agent tooling, and installed dependencies inside `apps/learning-platform`. Its design system is documented in [apps/learning-platform/docs/design-system.md](apps/learning-platform/docs/design-system.md).

There are **two separate dependency roots**. Run Composer and platform npm commands in `apps/learning-platform`; run client workspace npm commands in `apps`. Installing the Node workspaces does not install Laravel or its website dependencies.

## Local development

Use PHP 8.5, Composer 2, and Node 24 for the full stack. Desktop development also requires a graphical environment and Electron's operating-system runtime dependencies.

On a fresh checkout, initialize the learning platform from the repository root:

```bash
cd apps/learning-platform
composer setup
php artisan serve --host=127.0.0.1 --port=8000
```

`composer setup` installs dependencies, creates the local environment and application key, runs migrations, and builds the platform website. When editing that website, run `npm run dev` in another terminal in the same directory for Vite hot reload. The platform website remains available on port `8000`.

In a separate terminal, starting from the repository root, run the new client:

```bash
cd apps
npm ci
npm run dev
```

Open `http://localhost:5174`. Enter `http://localhost:8000` as the learning platform address. This checks compatibility and availability; it does not sign you in.

| Process             | Default address  | Responsibility                            |
| ------------------- | ---------------- | ----------------------------------------- |
| Laravel             | `127.0.0.1:8000` | Learning platform website and API         |
| Client Vite server  | `127.0.0.1:5174` | Client UI, hot reload, and `/api` proxy   |
| Client Node backend | `127.0.0.1:4318` | Browser transport and platform HTTP calls |

The client `npm run dev` starts Vite and the Node backend together. Laravel runs separately. Optional client development settings are listed in [apps/.env.example](apps/.env.example); copy it to `apps/.env` to customize the ports or reverse-proxy hostname.

## Electron development

From `apps`, after `npm ci`:

```bash
npm run setup:desktop
npm run dev:desktop -- --url=http://localhost:5174
```

The first command installs Electron's binary explicitly because dependency lifecycle scripts are disabled. The second loads the running Vite frontend while using the **local Electron main process** as its backend. The standalone browser backend is not used by Electron.

To run with bundled frontend assets instead:

```bash
npm run build
npm run dev:desktop
```

The frontend build goes to `apps/desktop/renderer`. `npm run pack:desktop` builds an unpacked desktop application; `npm run build:desktop` creates the configured installer for the build machine's platform. Outputs go to `apps/desktop/dist`. Packaged builds always use bundled assets and ignore the development URL override. PHP and Laravel are not included in these artifacts.

## Preview from another machine

Start Laravel and the client development servers on the remote machine as above. On your own machine, forward the client web port:

```bash
ssh -N -L 5174:127.0.0.1:5174 t3code@YOUR_SERVER
```

Open `http://localhost:5174` in your browser. Only this port is needed: Vite proxies API requests to the Node backend on the server. The backend can reach Laravel at `http://localhost:8000` on that server.

For a local Electron window displaying the remote frontend, also forward Laravel if it runs remotely:

```bash
ssh -N -L 5174:127.0.0.1:5174 -L 8000:127.0.0.1:8000 t3code@YOUR_SERVER
```

In a local checkout, run the Electron development commands from `apps` and connect to `http://localhost:8000`. In this mode, the frontend assets come from the server, but platform requests originate in Electron on your machine. The extra tunnel makes Laravel reachable there. If Laravel already runs locally, omit the second forwarding rule. Local Electron shell/backend changes require updating the local checkout and restarting Electron; frontend edits hot-reload from the remote Vite server.

## State and verification

Laravel owns the learning records and account data. The browser-preview backend saves its platform address in `apps/.local/connection.json` (overridable with `JUNIOR_SETTINGS_PATH`). Electron saves its address in `connection.json` under Electron's per-user application data directory. These are separate local settings, not copies of the learning database.

Run platform checks from `apps/learning-platform`:

```bash
composer ci:check
npm run build
```

Run client checks from `apps`:

```bash
npm run lint
npm test
npm run build
npm run test:electron
```

The Electron test requires the binary installed by `setup:desktop`, built frontend assets, and a display. On headless Linux, use `xvfb-run -a npm run test:electron`. It starts a test platform fixture and verifies the IPC-to-HTTP path. CI also tests the packaged Linux application; see [.github/workflows/tests.yml](.github/workflows/tests.yml).
