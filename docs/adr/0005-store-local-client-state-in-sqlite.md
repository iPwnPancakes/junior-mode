# Store local client state in SQLite

Status: Accepted  
Date: 2026-09-25

Projects, chat metadata, platform settings, plugin metadata, and authorization
were stored in separate JSON files. Project/chat relationships now need durable
constraints, and switching development checkouts should not switch browser
preview settings.

## Decision

The local Node backend owns one `junior-mode.sqlite` database, using Node's
built-in SQLite driver. Electron places it in its standard per-user application
data directory (`app.getPath('userData')`). The standalone browser backend uses
the operating system's application-data convention, under `Junior Mode/browser`
on Windows/macOS and `junior-mode/browser` under XDG data home on Linux.
`JUNIOR_DATA_DIR` overrides the standalone backend directory. Browser and Electron
data remain separate because their repositories and Codex processes can belong
to different machines.

Use relational project/chat tables, a settings table, and a credential BLOB table.
Enable foreign keys, WAL journaling, and version the schema with `user_version`.
Project/chat changes commit in transactions. The database is private to the
backend; the renderer continues using named HTTP/IPC capabilities.

The first launch imports previous JSON files in a transaction. Both flat and
project-aware chat indexes are supported. Preserve project/chat IDs and original
files. Record successful migration in the database so deleted credentials and
settings are not imported again. A failed import leaves no partial imported data
and can be retried. Do not overwrite a database from a newer schema version.

Electron continues encrypting credential payloads with OS-backed `safeStorage`
before writing them. SQLite itself does not encrypt the database. Browser preview
retains its existing unencrypted credential behavior with owner-only database
permissions. Transcripts and Codex login remain managed by Codex; Laravel still
owns durable learning records as specified in ADR 0001.

## Consequences

The backend requires Node 22.13 or newer (Node 24 is recommended). No third-party
native SQLite addon or Electron ABI rebuild is required. New installs write no
JSON state files. Legacy files remain as backups, including any previous credential
file; revoking a client on the learning platform invalidates its token everywhere.
For a live backup, use SQLite-aware backup tooling; a plain file copy should be
made after stopping the backend so WAL writes have been checkpointed.
