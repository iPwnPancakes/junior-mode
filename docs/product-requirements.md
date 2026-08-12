# Junior Mode Product Requirements

## Project description

Junior Mode is a self-hosted coaching system that helps developing programmers build durable understanding while completing real software work with Codex. It changes the agent's behavior from direct task completion into a learning-first collaboration: Codex identifies an applicable learning objective, implements routine work, reserves a bounded part for the Learner, provides graduated hints, reviews the attempt, and asks the Learner to explain the resulting code.

An authenticated MCP backend provides Codex with a compact view of the Learner's current coaching priorities and relevant evidence. It records structured observations and temporary supporting artifacts from each coaching session. A web application lets the Mentor review progress, maintain each Learner's competency catalog, direct future coaching, plan mentor-led exercises, and see when a Learner requested a complete solution.

Junior Mode is not a course platform or a surveillance system. It is an accountable coaching workflow for willing participants, grounded in the real tasks the Learner already needs to complete.

## Problem

Agentic development can make a junior developer productive without requiring them to inspect, understand, or retain the generated code. Traditional lessons provide repetition but often feel disconnected from immediate work, while real engineering tasks are too varied to provide predictable practice.

Junior Mode must connect programming fundamentals to the work where they matter. It must preserve useful agent productivity while creating focused opportunities for the Learner to attempt code, reason about it, and articulate a mental model. The Mentor needs trustworthy evidence of that process without reading every conversation or manually maintaining a mastery score.

## Product principles

1. **Learning comes first.** When Junior Mode is active, it optimizes for understanding rather than delivery speed.
2. **Teach through real work.** Coaching is attached to a real Work Item, not an unrelated lesson.
3. **Reserve bounded work.** Codex handles routine scaffolding while leaving one meaningful, achievable piece for the Learner.
4. **Require an attempt.** Completion alone is not evidence of understanding.
5. **Prefer graduated help.** Hints become progressively more concrete before a complete solution is available.
6. **Require articulation.** The Learner must explain intent and behavior in their own words rather than repeat syntax.
7. **Preserve evidence, not scores.** Competency State is transparently derived from an auditable sequence of Observations.
8. **Avoid shame.** Difficulty, hints, and Solution Escapes are learning signals, not punishment mechanisms.
9. **Keep the Mentor in control.** Agents may recommend priorities and catalog additions, but only the Mentor approves them.
10. **Spend context deliberately.** The backend returns a compact Coaching Brief instead of requiring Codex to reprocess the Learner's history.
11. **Track only chosen work.** Junior Mode operates only in explicitly Enrolled Repositories.

## People and access

### Mentor

The Mentor owns the self-hosted installation, invites Learners, approves Competency Catalogs, maintains Coaching Priorities, reviews evidence, and conducts Mentor Exercises.

### Learner

The Learner uses Junior Mode while completing real work, makes substantive attempts, requests hints, explains completed work, and may inspect or challenge anything recorded about them.

### Account requirements

- The first registered user on a fresh installation becomes the primary Mentor.
- Public registration closes after the primary Mentor is created.
- Additional users join through Mentor invitations as Learners.
- One Mentor may manage multiple Learners.
- Each Learner has exactly one Mentor in the MVP.
- A Learner must be able to see their full development record, including Assessments, Coaching Priorities, Observations, and Evidence Reviews.

## Product boundaries

Junior Mode consists of:

- A Codex plugin containing separate Junior Mode and Mentor Mode skills
- An authenticated MCP server backed by the self-hosted application
- A Mentor and Learner web application
- Email and in-app notifications

The plugin is installed once in a Codex installation. Junior Mode becomes active only inside repositories that a Mentor or Learner explicitly enrolls. Evidence from all repositories enrolled for one Learner contributes to that Learner's single development record.

The Codex skill owns coaching and conversation behavior. The backend owns durable learning state, authorization, Session state, Solution Escape eligibility, retention, and reporting. The backend cannot prevent a noncompliant client from printing a solution, so the product promises accountable workflow enforcement rather than tamper-proof control.

## Core workflows

### Installation and onboarding

1. The first user registers as the Mentor.
2. The Mentor invites a Learner.
3. The Learner signs in and authorizes a named Codex MCP client through a browser-based flow using a short-lived code.
4. The backend creates a revocable, long-lived client connection without requiring a permanent token to be copied manually.
5. The Mentor uses Mentor Mode to conduct a catalog interview covering relevant stacks, codebases, expected work, and development goals.
6. Codex submits an editable Catalog Proposal and optional baseline Assessments.
7. The Mentor edits and approves selected catalog branches and Assessments.
8. The Mentor or Learner enrolls the repositories in which Junior Mode should operate.

### Coaching Session

1. The Learner explicitly activates Junior Mode in a Codex conversation inside an Enrolled Repository.
2. Codex submits a sanitized Work Item title and description, optional external URL, repository identity, detected technologies, and likely catalog branches.
3. The backend returns a compact Coaching Brief.
4. Codex selects one relevant primary Learning Objective.
5. Codex explains why the objective matters and reserves a bounded change for the Learner.
6. The Learner makes a substantive attempt.
7. Codex reviews the attempt and either provides feedback or records a requested Hint.
8. Codex asks the Learner to explain the finished behavior according to their Explanation Standard.
9. Codex records one or more Observations and relevant Supporting Artifacts.
10. Codex or the Learner settles the Session, or it settles automatically after inactivity.

One Coaching Session covers one Work Item and one primary Learning Objective. It may span multiple chats. Changing the Work Item or primary objective starts a new Session. A later return to settled work creates a linked continuation Session.

### Graduated hints and Solution Escape

The standard Hint ladder is:

1. Point to the relevant concept or location.
2. Explain the concept and constraints.
3. Describe implementation steps or pseudocode.
4. Provide a close scaffold while leaving the decisive code incomplete.

Only an explicitly requested Hint advances the count. Clarifying questions and feedback on an existing attempt do not consume a Hint.

A Solution Escape is eligible only after:

- Four requested Hints have been recorded, and
- Codex has accepted at least one substantive Learner Attempt.

A substantive attempt must engage with the reserved work through code, a diff, detailed pseudocode, or a concrete debugging hypothesis. Copying the prompt, saying "I don't know," or making an unrelated edit does not qualify. Codex records a short rationale when accepting an attempt; the backend enforces that an accepted attempt and four Hints exist.

When requesting a Solution Escape, the Learner selects `still_stuck`, `deadline`, `blocked_by_environment`, or `other`, with optional explanatory text. The backend records the event and immediately sends an in-app and email notification to the Mentor. Notification failure must not block access to the solution. A Session using the escape can produce no stronger than a `partially_demonstrated` outcome.

### Explanation review

The default Explanation Standard asks the Learner to explain:

1. What problem the code solves
2. How information or control moves through it
3. Why the approach was chosen, or one reasonable alternative

Restating code or saying "because it works" is insufficient. Concrete examples, diagrams, and imperfect wording are acceptable when they reveal a working mental model.

If the first explanation is insufficient, Codex asks up to two targeted follow-ups using concrete scenarios or edge cases. Continued difficulty results in a `partially_demonstrated` Observation but must not prevent completion of the Work Item.

The Mentor may select `supportive`, `standard`, or `interview_practice` presets for each Learner and configure required explanation dimensions, follow-up count, alternative discussion, and example or edge-case requirements.

### Weekly Review and Mentor Exercise

The Mentor configures a Weekly Review schedule; the initial default is Friday. The review queue groups evidence by Learner and Coaching Priority and presents:

- Priorities that expired or are about to expire
- Evidence gathered since the prior review
- Unreviewed Solution Escapes and Learner challenges
- Agent-proposed priorities and Provisional Competencies
- Suggested Mentor Exercises

For each Coaching Priority, the Mentor can renew it, refine or replace it, mark it sufficiently demonstrated, close it, or convert it into a Mentor Exercise.

A Mentor Exercise is a tracked, Mentor-led learning activity linked to one or more Competencies. The Mentor can add Observations and an Assessment afterward. Mentor Observations are authoritative direct evidence and do not use agent Evidence Confidence.

## Competency Catalog

Each Learner owns a separate, Mentor-approved Competency Catalog organized as a tree. The hierarchy may combine stack-neutral fundamentals with stack-specific applications, for example:

```text
Programming
└── Control flow
    └── Conditional branching

Laravel
└── HTTP
    └── Form Request validation
```

Evidence attaches to the most precise applicable Competency and does not automatically count as direct evidence for every ancestor. Parent nodes organize discovery and reporting.

Each Competency contains:

- Name
- Short definition
- Parent Competency, unless it is a root
- Observable demonstration criteria
- Optional prerequisites
- Optional example work opportunities
- Optional applicable technologies

Reusable Competency Templates provide candidate subtrees for topics such as programming fundamentals, PHP, Laravel, Godot, and GDScript. Approving a template copies its selected nodes into the Learner's catalog so later customization does not affect other Learners.

The catalog review must allow the Mentor to rename, move, add, and remove proposed nodes and approve selected branches. Once a Competency is referenced by evidence, it may be renamed, moved, archived, or explicitly merged but not destructively deleted. Merges retain an audit trail and historical references.

When Codex encounters an uncataloged concept during work, it may use a Provisional Competency as the immediate Learning Objective and submit a proposed node. The resulting Observation remains uncataloged until the Mentor approves the node or maps it to an existing Competency.

## Coaching Brief

The backend generates the Coaching Brief deterministically without an LLM call. It selects a small, fixed amount of relevant information from:

1. Active high-emphasis Coaching Priorities
2. Active normal-emphasis Coaching Priorities
3. Recent evidence of difficulty
4. Stale or contradictory evidence
5. Applicable unobserved catalog branches
6. Relevant successful Competencies that provide useful context

Relevance to the current Work Item is mandatory. A high-priority Competency must not be forced into unrelated work; it remains active for a later opportunity or Mentor Exercise.

The brief supplies concise reasons and enough evidence context for Codex to select one primary Learning Objective. Codex may report incidental Observations about secondary Competencies but must not turn one task into several simultaneous lessons.

## Coaching Priorities and Assessments

A Coaching Priority represents desired future attention, not proof of weakness. It has normal or high emphasis and either:

- Uses the Mentor's configurable default expiration, initially seven days
- Uses a priority-specific expiration, or
- Remains active until manually removed

Only the Mentor may activate, change, or close a Coaching Priority. Codex may submit recommendations for approval.

An Assessment is the Mentor's independent judgment of a Learner's current proficiency in a Competency. Its values are:

- `not_yet_observed`
- `developing`
- `consistent`
- `independent`

Assessments, Coaching Priorities, and Observations are distinct records and may legitimately disagree.

## Observations and evidence

An agent Observation records:

- Primary Competency and any secondary Competencies
- Specific demonstrated behavior
- Per-Competency outcome: `demonstrated`, `partially_demonstrated`, or `not_demonstrated`
- Assistance Level and raw Hint count
- Whether a Solution Escape occurred
- Learner explanation
- Evidence Confidence from 1 through 5
- Work Item and Session context
- Reporting Learner and named MCP client
- Timestamp and Supporting Artifact references

Assistance Levels are:

- `independent`: no Hints
- `conceptual`: one Hint
- `guided`: two Hints
- `scaffolded`: three or four Hints
- `solution_provided`: Solution Escape used

Evidence Confidence describes evidence quality rather than Learner proficiency:

1. Highly uncertain or indirect inference
2. Limited evidence
3. Reasonable evidence with ambiguity
4. Strong direct evidence
5. Repeated or exceptionally clear evidence within the Session

Confidence 1–2 Observations remain visible but require Mentor review before changing Competency State. Confidence 3–5 Observations participate automatically.

The Learner may add a visible challenge and explanation to any Observation. A challenge enters the Mentor's review queue without rewriting the Observation. The Mentor records an Evidence Review that endorses, corrects, or disputes the evidence:

- Endorsed evidence participates normally and takes precedence over unreviewed evidence.
- Corrected evidence uses the corrected outcome in state derivation while preserving the original report.
- Disputed evidence is excluded from state derivation.
- A later Evidence Review may supersede an earlier review.

Substantive Session, Observation, Solution Escape, and Evidence Review history is append-only. Typographical or display metadata may be corrected in place.

## Competency State

Competency State is a transparent summary derived from evidence, not a stored mastery score. Supported states are:

- `unobserved`
- `needs_attention`
- `developing`
- `recently_demonstrated`
- `consistently_demonstrated`
- `stale`

Default derivation rules are:

- No accepted evidence produces `unobserved`.
- A recent, accepted `not_demonstrated` Observation produces `needs_attention`, even after earlier consistency.
- A recent `partially_demonstrated` Observation produces `developing` unless stronger, newer evidence supersedes it.
- A recent `demonstrated` Observation produces `recently_demonstrated` until the consistency threshold is met.
- Three `demonstrated` Observations from separate Sessions produce `consistently_demonstrated` when at least two used `independent` or `conceptual` assistance and no newer contradictory Observation exists.
- A demonstrated state becomes `stale` after 90 days without relevant evidence.

The Mentor may configure the consistency count and staleness period for each Learner. A new poor result downgrades the current state without deleting prior success. Later successful evidence can restore a stronger state. The dashboard must show the evidence and rules responsible for every derived state.

## Repository enrollment

- Junior Mode operates only in Enrolled Repositories.
- The Mentor or Learner may enroll or unenroll a repository.
- Enrolling a personal repository opts it into the same Mentor-visible learning record.
- A normalized Git remote identifies a repository when available.
- A generated repository identifier supports repositories without a remote.
- Display names and local paths are separate from repository identity so clones and folder renames do not fragment history.
- Unenrollment prevents future tracking but does not silently delete existing structured evidence.

## Supporting Artifacts and retention

Supporting Artifacts are temporary Session context. They may include relevant conversation excerpts, code, diffs, issue descriptions, repository metadata, and optional external URLs such as Linear issues or GitHub pull requests.

The client and server must redact likely credentials. Environment files, ignored files, binaries, unrelated working-tree changes, and detected secrets must not be uploaded. Mentors may configure additional repository-specific exclusions. When safe redaction is possible, the remaining artifact is accepted with a warning; otherwise, only that artifact is rejected and the structured Observation remains valid.

A Session settles manually or after 72 hours of inactivity with one of these reasons:

- Concluded
- Abandoned
- Superseded
- Inactivity

Settlement does not imply success or failure. Supporting Artifacts expire and are deleted 30 days after settlement. Structured Observations, artifact metadata, Evidence Reviews, and unresolved review items remain. The Mentor must have enough time to review an escape before its artifacts expire.

## MCP requirements

The MCP server must support operations to:

- Authorize and identify a named Codex client
- Resolve whether the current repository is enrolled
- Retrieve a contextual Coaching Brief
- Start or continue a Coaching Session
- Record a requested Hint
- Record and agent-evaluate a Learner Attempt
- Check Solution Escape eligibility
- Record Observations and Supporting Artifacts
- Settle a Coaching Session
- Submit Coaching Priority and Competency proposals
- Support Mentor catalog interviews, reviews, and exercises

Every mutation must enforce the authenticated person's role and ownership boundaries. Every agent-reported event records its client connection and source.

If the MCP backend is unavailable, Codex continues with the generic coaching loop and clearly states that personalization and recording are unavailable. It must not persist conversations or diffs into an insecure local retry queue. The Learner may summarize the Session after connectivity returns.

## Dashboard requirements

### Mentor dashboard

The Mentor dashboard must provide:

- Learner overview and recent development activity
- Friday-style Weekly Review queue on a configurable schedule
- Active, expiring, and expired Coaching Priorities
- Competency tree with evidence-backed states
- Recent Coaching Sessions and Observations
- Solution Escape notifications and details
- Learner challenges and Evidence Review actions
- Catalog Proposal and Provisional Competency review
- Mentor Exercise planning and recording
- Named MCP client management
- Artifact-retention and exclusion settings

### Learner dashboard

The Learner dashboard must provide:

- Current Coaching Priorities and their reasons
- Competency tree and the evidence behind every state
- Recent Sessions, Observations, Assessments, and Evidence Reviews
- Mentor Exercises
- Connected MCP clients
- Enrolled Repositories
- A way to challenge an Observation

## Notifications

- A Solution Escape immediately generates an in-app notification and email to the Mentor.
- A configurable weekly email digest summarizes expiring priorities, unreviewed escapes, notable evidence, and suggested Mentor Exercises.
- Routine Observations remain in the application and do not produce individual emails.
- Notification delivery failure must not block coaching or evidence recording.

## Non-functional requirements

- **Self-hosted:** The application must not require an external multi-tenant service.
- **Stack-neutral:** The evidence model must support PHP, Laravel, Godot, GDScript, and future technologies without schema redesign.
- **Token-efficient:** Normal Session startup must use a compact Coaching Brief rather than full-history context.
- **Transparent:** Every derived state must be explainable from visible evidence and rules.
- **Auditable:** Substantive corrections and disagreements preserve original reports.
- **Private by scope:** Only Enrolled Repositories are tracked, and artifacts are temporary and sanitized.
- **Resilient:** Coaching can continue without personalization during an MCP outage.
- **Configurable:** Priority duration, Explanation Standard, consistency threshold, staleness window, review schedule, artifact exclusions, and notification preferences are Mentor-controlled.

## MVP scope

The first release must support this complete vertical slice:

1. A Mentor bootstraps an installation and invites a Learner.
2. The Learner authorizes a named Codex MCP client.
3. Mentor Mode proposes a learner-specific Competency Catalog and baseline Assessments.
4. The Mentor edits and approves the proposal and creates initial Coaching Priorities.
5. The Mentor or Learner enrolls a repository.
6. Junior Mode retrieves a Coaching Brief for a real Work Item.
7. Codex reserves bounded work and conducts the attempt, Hint, explanation, and review loop.
8. The backend enforces Solution Escape eligibility and records the Session.
9. Both dashboards show the resulting evidence and Competency State.
10. The Mentor receives escape notifications and completes a Weekly Review.
11. The Mentor creates and records a Mentor Exercise.
12. Session artifacts expire while structured evidence remains.

The initial pilot uses one Mentor and one Learner for four weeks. It succeeds when:

- The Learner makes substantive attempts before receiving complete solutions.
- The Learner increasingly explains intent and behavior instead of reciting code.
- Repeated demonstrations require fewer Hints.
- The Mentor can prepare Weekly Reviews and Mentor Exercises from the dashboard.
- The Mentor reports greater trust in the Learner's ability to inspect and reason about agent-produced code.

## MVP non-goals

- Organizations or multi-tenant SaaS
- Multiple Mentors for one Learner
- Native Linear or GitHub synchronization
- Calendar integration
- Cross-agent support beyond Codex
- A server-side AI provider
- Surveillance or cheat prevention outside compliant Junior Mode use
- Courses, quizzes, or generic lesson content
- A single opaque mastery score

## Future feature requests

The following are explicitly desirable after the MVP but intentionally unspecified:

- Calendar integration
- Courses
- Quizzes
- Generic lesson content
- Native Linear and GitHub integration
- Additional coding-agent hosts
- Multiple Mentors and organization support

Future learning content should reuse the Competency, Observation, Assessment, and Coaching Priority model rather than create a disconnected learning record.
