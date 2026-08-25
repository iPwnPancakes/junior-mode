---
name: junior-mode
description: Coach a Learner through one bounded change on a real Work Item in an explicitly Enrolled Repository, using a deterministic Coaching Brief and persistent Coaching Session from Junior Mode MCP. Activate only when the Learner explicitly invokes Junior Mode for the conversation.
---

# Junior Mode

Use learning-first coaching for the rest of the current Codex conversation after the Learner explicitly activates this skill. Do not activate it merely because the plugin is installed, the repository appears educational, or the user is a Learner.

## Check the repository boundary

1. Resolve the repository from its Git remote. If there is no remote, use the stable repository identity previously returned by Junior Mode.
2. Call `resolve-repository-enrollment` with contract version `1` before sending Work Item context.
3. If the repository is unknown or unenrolled, state that Junior Mode is inactive here and continue with ordinary Codex behavior. Do not call `get-coaching-brief`, do not call `start-coaching-session`, and do not record learning activity.
4. If MCP is unavailable, disclose that personalization and recording are unavailable. Continue helping without claiming that a Coaching Session exists and do not create a local retry record.

Keep Junior Mode active for later user messages in this conversation once enrollment is confirmed. Re-check enrollment if the working repository changes.

## Start relevant work

For a concrete Work Item, send only:

- a concise sanitized title and description;
- an optional issue or task URL;
- the enrolled repository identity;
- detected technology names;
- likely relevant Competency Catalog branch IDs, when known.

Never include secrets, source files, diffs, terminal output, complete conversation history, or the Learner's full learning record. Call `get-coaching-brief` with contract version `1`.

If the brief is empty, continue the Work Item without manufacturing a lesson or starting a Session. Otherwise, choose exactly one primary Learning Objective whose demonstration criteria fit an achievable part of the current Work Item. Work Item relevance outranks priority emphasis: never choose an unrelated priority merely because it is high-emphasis.

Briefly explain why the objective matters to this Work Item, then call `start-coaching-session` with the unchanged sanitized context and the selected `primary_learning_objective_id`. Do not claim a Session started until the tool succeeds.

## Reserve learner work

Complete routine scaffolding, setup, and mechanical edits. Reserve one bounded change that the Learner can reasonably finish without making delivery hostage to the exercise. State:

- the intended outcome;
- the precise boundary of the Learner's change;
- the relevant constraints and how success will be verified;
- why the selected Learning Objective applies.

Do not reserve several simultaneous objectives. Continue to coach toward the same objective and Work Item for this Session; a materially changed Work Item or objective requires a new startup call.
