---
name: mentor-mode
description: Interview a Mentor about a Learner's stacks, codebases, expected work, and development goals, then submit a reviewable Competency Catalog Proposal and optional baseline Assessments through Junior Mode MCP. Use when a Mentor asks to onboard a Learner, begin or continue a catalog interview, propose a Learner catalog, or establish a baseline.
---

# Mentor Mode

Create an inert onboarding proposal for the Mentor to edit and approve in the Junior Mode web application. Never treat the interview or MCP submission as approval.

## Start the interview

1. Call `identify-client` and state which Learner and named connection will receive the proposal.
2. Confirm the person conducting the interview is that Learner's Mentor. The Learner-owned connection may submit only an inert proposal; the backend requires the Mentor's web account for every approval.
3. Call `begin-catalog-interview` before asking the substantive interview questions. Reuse the returned `proposal_id` for submission.
4. If the MCP server is unavailable, state that personalization and recording are unavailable. Continue only as an unrecorded conversation, do not create a local retry file, and do not claim a proposal exists.

## Interview the Mentor

Gather all four topic groups returned by the tool:

- relevant languages, frameworks, tools, and platforms;
- codebases and the kinds of systems they contain;
- expected near-term work;
- development goals for understanding, autonomy, and engineering judgment.

Ask focused follow-ups until the answers are concrete enough to define observable Competencies. Do not assume PHP, Laravel, Godot, GDScript, or any other stack. Distinguish what the Mentor directly observed from what they merely expect the Learner to encounter.

## Build the proposal

Create a learner-specific tree from broad organizing nodes to the most precise observable Competencies. Every node must include:

- a concise name and definition;
- demonstration criteria phrased as behavior someone could observe;
- a submission-local unique `key` and optional `parent_key`;
- sibling `position`;
- optional prerequisites, work opportunities, and technologies as string arrays.

Keep the tree relevant to the interview. Do not copy every known framework topic or turn technology names into proficiency claims.

Baseline Assessments are optional and separate from catalog approval. Use only these values: `not_yet_observed`, `developing`, `consistent`, or `independent`. Prefer `not_yet_observed` unless the Mentor gave direct behavioral evidence. For any stronger level, include a short rationale tied to that evidence. Never infer proficiency from job title, tenure, stack familiarity, or planned work.

Summarize the proposed roots, the most important leaf Competencies, and every non-unknown baseline judgment. Resolve factual corrections from the Mentor before submission.

## Submit and hand off

Call `submit-catalog-proposal` once with the complete interview context, node tree, and baseline Assessment list. Include `baseline_assessments: []` when none are justified.

After a successful response:

- state that the proposal is awaiting review and has no current effect;
- report the returned node and baseline Assessment counts;
- direct the Mentor to the Junior Mode dashboard to rename, move, add, remove, select, approve, or reject nodes;
- remind them that catalog and baseline Assessment decisions are independent.

Do not call submission again for the same proposal. Do not claim that a Competency, Assessment, template, or current proficiency changed until the web review records that decision.
