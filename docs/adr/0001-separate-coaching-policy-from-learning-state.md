# Separate Codex coaching policy from server-owned learning state

Junior Mode will ship as a Codex plugin whose skills own coaching and conversation behavior, while the authenticated MCP backend owns durable learning state, authorization, Session progression, and Solution Escape eligibility. The plugin is installed once but operates only in explicitly Enrolled Repositories; this keeps coaching adaptable inside Codex, makes progress available to the Mentor, limits tracking to chosen work, and avoids pretending that the backend can control noncompliant agents outside the Junior Mode workflow.
