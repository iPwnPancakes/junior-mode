# Junior Mode

Junior Mode is a learning-first coaching system that helps developing programmers build understanding while completing real software work. It adapts coding-agent assistance using evidence from the learner's work and guidance from a mentor.

## People

**Learner**:
A developer whose understanding is being developed and observed through real work.
_Avoid_: Junior, student

**Mentor**:
A person who reviews a learner's development and directs where coaching attention should be applied.
_Avoid_: Senior, teacher

## Coaching

**Junior Mode**:
The learning-first coaching behavior in which an agent selects an applicable learning objective, reserves bounded work for the learner, provides graduated hints, reviews the attempt, and records the outcome.

**Enrolled Repository**:
A source repository in which a Learner or Mentor has explicitly enabled Junior Mode. Work outside enrolled repositories is not tracked.

**Learning Objective**:
A competency selected as the focus of a particular piece of real work.
_Avoid_: Lesson

**Explanation Standard**:
The mentor-configurable expectations used to determine whether a learner can articulate their understanding rather than merely restate code.

**Coaching Session**:
A period of coaching centered on one Work Item and one primary Learning Objective. It groups the learner's attempts, requested hints, observations, and supporting artifacts.

**Settled Session**:
A Coaching Session that no longer accepts normal coaching activity because it was concluded, abandoned, superseded, or inactive for too long. Settling a session does not imply success or failure.
_Avoid_: Completed session

**Expired Session**:
A Settled Session whose temporary Supporting Artifacts have reached the end of their retention period and been removed.

**Hint**:
A bounded piece of guidance that helps a learner advance without supplying the complete answer.

**Learner Attempt**:
A substantive effort by the learner to complete reserved work before receiving the complete solution.
_Avoid_: Guess

**Solution Escape**:
An explicit request for the complete solution after the learner has exhausted the required hints. Using it is visible to the mentor and forms part of the learning record.

## Development

**Competency**:
A categorized area of programming understanding in which a learner can accumulate evidence over time. Competencies form a hierarchy that can include both stack-neutral fundamentals and stack-specific applications.
_Avoid_: Skill, weak area

**Observation**:
A factual report of demonstrated behavior in a particular work context, including the assistance received and the outcome.
_Avoid_: Score

**Evidence Confidence**:
An agent's one-to-five judgment of how directly and clearly an Observation supports its report. It describes the evidence, not the Learner's proficiency.

**Assistance Level**:
A classification of how much help the Learner received, ranging from independent work through conceptual guidance, guided work, scaffolding, and a provided solution.

**Competency State**:
A transparent summary derived from a Competency's current body of evidence. New contradictory evidence can downgrade the state without erasing earlier Observations.
_Avoid_: Mastery score

**Coaching Brief**:
A compact, current summary of the learner's relevant development record that informs how Junior Mode should coach them without requiring their full history.

**Assessment**:
A mentor's judgment about a learner's current proficiency in a competency.

**Coaching Priority**:
A flexible, usually time-limited direction from a mentor indicating a competency in which future learning opportunities should be sought. A priority may instead remain active until the mentor removes it.

**Mentor Exercise**:
A mentor-led learning activity used to deliberately test or develop a learner's understanding of one or more competencies.

**Weekly Review**:
A recurring Mentor workflow for reviewing evidence, maintaining Coaching Priorities, and preparing Mentor Exercises.

**Supporting Artifact**:
Temporary source material associated with a Coaching Session, such as a conversation, code, diff, issue description, or repository reference, that can provide additional context for its observations.

**Evidence Review**:
A mentor's endorsement, correction, or dispute of an observation that preserves the originally reported evidence.

**Work Item**:
The real development task in which coaching and observation occur, identified by descriptive context and, when available, an external reference.
_Avoid_: Lesson, assignment

## Catalog

**Competency Catalog**:
The mentor-approved, learner-specific hierarchy of competencies available for that learner's coaching and observation.

**Competency Template**:
A reusable candidate subtree that can be copied into and customized within a Learner's Competency Catalog.

**Catalog Proposal**:
A candidate Competency Catalog produced from a mentor-led onboarding interview that has no effect until the mentor approves it.

**Provisional Competency**:
An uncataloged area of understanding identified during real work that may be used for immediate coaching while awaiting the Mentor's decision to map or approve it.
