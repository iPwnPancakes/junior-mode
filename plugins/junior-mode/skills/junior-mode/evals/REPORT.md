# Coaching evaluation — 2026-09-24

The independent Astra low forward evaluation read only the revised skill and `scenarios.json`, without the expected-output rubric or implementation history. `forward-results.json` preserves its generated next replies and intended tool calls for nine scenarios. These are model-generated behavioral dry runs with supplied context, not live MCP executions or a real Learner/Mentor pilot.

Review against `evals.json` found the intended behavior in all nine cases: stop at the Learner-owned change; answer syntax directly; reject a requirement-breaking proposal with reasons; refuse invented verification; retain the service's stage on a repeated task; distinguish handoff facts and hypotheses without sharing; disclose an unavailable service; neutrally explain an ineligible Solution Escape; and produce an evidence-specific receipt.

The first startup plan nested Work Item fields and omitted two required arrays. The skill now explicitly lists top-level startup arguments and defers to the discovered schema. `startup-reevaluation.json` records a second independent response with the corrected shape and a pause before the Learner's implementation. That dry-run fixture still uses a synthetic repository identifier and lacks the exact prior brief request; it is not proof of a schema-valid executed call. Real platform contract tests exercise the actual payload validation separately.

To reproduce behavioral evaluation, give an independent agent only `SKILL.md` and `scenarios.json`, asking for the next reply and intended tool calls for each separate scenario without real writes. Review the generated artifacts against `evals.json`. Preserve observed failures before revising the skill; substring checks against the instructions are not behavioral evidence.

Separate automated checks cover:

- Plugin/skill manifest validation and the Node capability boundary, including explicit installation and damaged policy rejection.
- Real Codex CLI installation into an isolated home, preserving an unrelated configuration setting; real app-server prompt assembly against a local Responses fixture proves the installed policy is included only in coaching threads. This fixture does not evaluate model quality.
- Real Codex-to-Laravel authenticated MCP identity, enrollment, and Coaching Brief retrieval without a model turn.
- Laravel authorization, evidence derivation, hints/attempts/escape eligibility, idempotency, handoff privacy, and production dependency startup.

Longitudinal independence, Mentor handoff usefulness in real work, actual model/tool sequencing over multi-turn tasks, and broader adversarial behavior still require the explicitly tracked real pilot.
