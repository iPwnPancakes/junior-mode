import { Form } from '@inertiajs/react';
import { ChevronRight, ReceiptText, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { selectClasses } from '@/components/coaching-focus';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { store } from '@/routes/learning-evidence-corrections';

type Evidence = {
    activity: string;
    assistance: string;
    hints_used: number;
    ownership: string;
    learner_work: string;
    agent_work: string;
    verification: { passed: boolean; reference: string };
    teach_back: { demonstrated: boolean; summary: string };
    context_key: string;
    context_description: string;
    source: string;
    transfer_from_id?: number;
    material_difference?: string;
};
type Observation = {
    id: number;
    session_id: number;
    qualifies: boolean;
    recorded_at: string;
    recorded_hints_used?: number;
    solution_escape_used?: boolean;
    evidence: Evidence;
};
export type Progress = {
    assessment_relationship: string;
    competencies: {
        competency_id: number;
        name: string;
        stage: string;
        has_evidence: boolean;
        next_stage_requirement: string;
        suggested_support: string;
        supporting_evidence: Observation[];
        correction_history: {
            id: number;
            supersedes_id: number;
            reason: string;
            original_evidence: Evidence;
        }[];
        assistance_trend: {
            evidence_id: number;
            assistance: string;
            hints_used: number;
        }[];
    }[];
};
export type LearningReceipt = {
    id: number;
    title: string;
    completion: {
        outcome: string;
        reflection: string;
        unresolved_questions: string[];
        next_challenge: string;
    };
};

const label = (value: string) => value.replaceAll('_', ' ');

const sentence = (value: string) => {
    const words = label(value);

    return words.charAt(0).toUpperCase() + words.slice(1);
};

const hints = (count: number) => `${count} ${count === 1 ? 'hint' : 'hints'}`;

function recordedAssistance(recordedHints: number, solutionEscape: boolean) {
    const parts = [
        ...(recordedHints > 0
            ? [
                  `${recordedHints} requested ${recordedHints === 1 ? 'hint' : 'hints'}`,
              ]
            : []),
        ...(solutionEscape ? ['a Solution Escape'] : []),
    ];
    const verb = recordedHints + (solutionEscape ? 1 : 0) > 1 ? 'were' : 'was';

    return sentence(
        `${parts.join(' and ')} ${verb} recorded for this Session.`,
    );
}

const stageTones: Record<string, 'neutral' | 'info' | 'success'> = {
    introduced: 'neutral',
    guided: 'info',
    independent: 'success',
    transferable: 'success',
};

function EvidenceSummary({
    evidence,
    recordedHints = 0,
    solutionEscape = false,
}: {
    evidence: Evidence;
    recordedHints?: number;
    solutionEscape?: boolean;
}) {
    return (
        <dl className="grid gap-2 text-sm">
            <div>
                <dt className="font-medium">Learner contribution</dt>
                <dd>{evidence.learner_work || 'None recorded'}</dd>
            </div>
            <div>
                <dt className="font-medium">Agent contribution</dt>
                <dd>{evidence.agent_work || 'None recorded'}</dd>
            </div>
            <div>
                <dt className="font-medium">Assistance</dt>
                <dd>
                    {sentence(evidence.assistance)} ·{' '}
                    {hints(evidence.hints_used)} · {label(evidence.ownership)}{' '}
                    ownership
                </dd>
            </div>
            {(recordedHints > 0 || solutionEscape) && (
                <div>
                    <dt className="font-medium">Recorded Session assistance</dt>
                    <dd>
                        {recordedAssistance(recordedHints, solutionEscape)} This
                        assistance limits independence even when the original
                        observation above reports less help.
                    </dd>
                </div>
            )}
            <div>
                <dt className="font-medium">Verification</dt>
                <dd>
                    {evidence.verification.passed ? 'Passed' : 'Not passed'}:{' '}
                    {evidence.verification.reference}
                </dd>
            </div>
            <div>
                <dt className="font-medium">Understanding</dt>
                <dd>
                    {evidence.teach_back.demonstrated
                        ? 'Demonstrated'
                        : 'Not yet demonstrated'}
                    : {evidence.teach_back.summary}
                </dd>
            </div>
            <div>
                <dt className="font-medium">Context</dt>
                <dd>{evidence.context_description}</dd>
            </div>
            <div>
                <dt className="font-medium">Source</dt>
                <dd>{sentence(evidence.source)}</dd>
            </div>
            {evidence.material_difference && (
                <div>
                    <dt className="font-medium">
                        Transfer to a different context
                    </dt>
                    <dd>{evidence.material_difference}</dd>
                </div>
            )}
        </dl>
    );
}

function Correction({ observation }: { observation: Observation }) {
    const [open, setOpen] = useState(false);
    const evidence = observation.evidence;

    return (
        <div className="mt-3">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
            >
                {open ? 'Cancel correction' : 'Correct this observation'}
            </Button>
            {open && (
                <Form
                    {...store.form(observation.id)}
                    transform={(data) => ({
                        ...data,
                        evidence: {
                            ...evidence,
                            ...(data.evidence as Partial<Evidence>),
                        },
                    })}
                    className="mt-4 grid gap-3"
                >
                    {({ errors, processing }) => (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Your correction appends a new observation. The
                                original remains visible in the history.
                            </p>
                            {(
                                [
                                    'learner_work',
                                    'agent_work',
                                    'context_description',
                                ] as const
                            ).map((field) => (
                                <label
                                    key={field}
                                    className="grid gap-1 text-sm"
                                >
                                    {label(field)}
                                    <Textarea
                                        name={`evidence[${field}]`}
                                        defaultValue={evidence[field]}
                                        maxLength={1000}
                                    />
                                </label>
                            ))}
                            <label className="grid gap-1 text-sm">
                                Ownership
                                <select
                                    name="evidence[ownership]"
                                    defaultValue={evidence.ownership}
                                    className={selectClasses}
                                >
                                    {['learner', 'shared', 'agent'].map(
                                        (value) => (
                                            <option key={value}>{value}</option>
                                        ),
                                    )}
                                </select>
                            </label>
                            <label className="grid gap-1 text-sm">
                                Assistance
                                <select
                                    name="evidence[assistance]"
                                    defaultValue={evidence.assistance}
                                    className={selectClasses}
                                >
                                    {[
                                        'review_only',
                                        'conceptual_hint',
                                        'guided',
                                        'scaffolded',
                                        'solution_provided',
                                    ].map((value) => (
                                        <option key={value} value={value}>
                                            {label(value)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="grid gap-1 text-sm">
                                Hints used
                                <Input
                                    type="number"
                                    name="evidence[hints_used]"
                                    min={0}
                                    max={100}
                                    defaultValue={evidence.hints_used}
                                    required
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                Verification
                                <select
                                    name="evidence[verification][passed]"
                                    defaultValue={
                                        evidence.verification.passed ? '1' : '0'
                                    }
                                    className={selectClasses}
                                >
                                    <option value="1">Passed</option>
                                    <option value="0">Not passed</option>
                                </select>
                            </label>
                            <label className="grid gap-1 text-sm">
                                Verification reference
                                <Textarea
                                    name="evidence[verification][reference]"
                                    defaultValue={
                                        evidence.verification.reference
                                    }
                                    required
                                    maxLength={1000}
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                Understanding
                                <select
                                    name="evidence[teach_back][demonstrated]"
                                    defaultValue={
                                        evidence.teach_back.demonstrated
                                            ? '1'
                                            : '0'
                                    }
                                    className={selectClasses}
                                >
                                    <option value="1">Demonstrated</option>
                                    <option value="0">
                                        Not yet demonstrated
                                    </option>
                                </select>
                            </label>
                            <label className="grid gap-1 text-sm">
                                Teach-back summary
                                <Textarea
                                    name="evidence[teach_back][summary]"
                                    defaultValue={evidence.teach_back.summary}
                                    required
                                    maxLength={1000}
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                Reason for correction
                                <Textarea
                                    name="correction_reason"
                                    required
                                    maxLength={1000}
                                />
                            </label>
                            {Object.entries(errors).map(([key, error]) => (
                                <p
                                    key={key}
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    {error}
                                </p>
                            ))}
                            <Button disabled={processing} type="submit">
                                Append correction
                            </Button>
                        </>
                    )}
                </Form>
            )}
        </div>
    );
}

export function LearningProgress({
    progress,
    receipts,
}: {
    progress: Progress;
    receipts: LearningReceipt[];
}) {
    const observed = progress.competencies.filter(
        (competency) => competency.has_evidence,
    );
    const unobserved = progress.competencies.filter(
        (competency) => !competency.has_evidence,
    );

    return (
        <SectionCard
            title="Learning progress"
            description={progress.assessment_relationship}
            icon={TrendingUp}
        >
            <div className="grid gap-3">
                {progress.competencies.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Learning progress appears when your catalog has
                        competencies.
                    </p>
                )}
                {observed.map((competency) => (
                    <article
                        key={competency.competency_id}
                        aria-label={competency.name}
                        className="grid gap-2 rounded-lg border bg-background p-4 text-sm"
                    >
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="font-medium">{competency.name}</h3>
                            <StatusBadge
                                tone={stageTones[competency.stage] ?? 'neutral'}
                            >
                                {sentence(competency.stage)}
                            </StatusBadge>
                        </div>
                        <p className="leading-6">
                            {competency.next_stage_requirement}
                        </p>
                        <p className="text-muted-foreground">
                            Suggested support:{' '}
                            {sentence(competency.suggested_support)}
                            {competency.assistance_trend.length > 0 && (
                                <>
                                    {' · '}Assistance over time:{' '}
                                    {competency.assistance_trend
                                        .map(
                                            (event) =>
                                                `${label(event.assistance)} (${hints(event.hints_used)})`,
                                        )
                                        .join(' → ')}
                                </>
                            )}
                        </p>
                        {competency.supporting_evidence.map((observation) => (
                            <details
                                key={observation.id}
                                className="group rounded-md border bg-card p-3"
                            >
                                <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
                                    <ChevronRight
                                        aria-hidden="true"
                                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                                    />
                                    Observation #{observation.id}
                                    <StatusBadge
                                        tone={
                                            observation.qualifies
                                                ? 'success'
                                                : 'neutral'
                                        }
                                    >
                                        {observation.qualifies
                                            ? 'Supports progress'
                                            : 'Does not establish independence'}
                                    </StatusBadge>
                                </summary>
                                <div className="mt-3 pl-6">
                                    <EvidenceSummary
                                        evidence={observation.evidence}
                                        recordedHints={
                                            observation.recorded_hints_used
                                        }
                                        solutionEscape={
                                            observation.solution_escape_used
                                        }
                                    />
                                    <Correction observation={observation} />
                                </div>
                            </details>
                        ))}
                        {competency.correction_history.map((correction) => (
                            <details key={correction.id} className="group">
                                <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground [&::-webkit-details-marker]:hidden">
                                    <ChevronRight
                                        aria-hidden="true"
                                        className="size-4 shrink-0 transition-transform group-open:rotate-90"
                                    />
                                    Correction #{correction.id} replaced #
                                    {correction.supersedes_id}
                                </summary>
                                <div className="mt-2 pl-6">
                                    <p className="mb-2">{correction.reason}</p>
                                    <EvidenceSummary
                                        evidence={correction.original_evidence}
                                    />
                                </div>
                            </details>
                        ))}
                    </article>
                ))}
                {unobserved.length > 0 && (
                    <article
                        aria-label="Competencies without evidence"
                        className="grid gap-2 rounded-lg border border-dashed bg-background p-4 text-sm"
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge>Not yet observed</StatusBadge>
                            <span className="text-muted-foreground">
                                {unobserved.length}{' '}
                                {unobserved.length === 1
                                    ? 'competency has'
                                    : 'competencies have'}{' '}
                                no evidence yet
                            </span>
                        </div>
                        <ul className="flex flex-wrap gap-1.5">
                            {unobserved.map((competency) => (
                                <li
                                    key={competency.competency_id}
                                    className="rounded-md bg-muted px-2 py-0.5 font-medium"
                                >
                                    {competency.name}
                                </li>
                            ))}
                        </ul>
                        <p className="leading-6">
                            {unobserved[0].next_stage_requirement}
                        </p>
                        <p className="text-muted-foreground">
                            Suggested support:{' '}
                            {sentence(unobserved[0].suggested_support)}
                        </p>
                    </article>
                )}
                {receipts.length > 0 && (
                    <section
                        aria-labelledby="learning-receipts"
                        className="mt-3 grid gap-3"
                    >
                        <h3
                            id="learning-receipts"
                            className="flex items-center gap-2 text-sm font-medium"
                        >
                            <ReceiptText
                                aria-hidden="true"
                                className="size-4 text-muted-foreground"
                            />
                            Learning receipts
                        </h3>
                        {receipts.map((receipt) => (
                            <article
                                key={receipt.id}
                                aria-label={`Learning receipt: ${receipt.title}`}
                                className="grid gap-2 rounded-lg border bg-background p-4 text-sm"
                            >
                                <h4 className="font-medium">{receipt.title}</h4>
                                <p className="leading-6">
                                    {receipt.completion.outcome}
                                </p>
                                <p className="leading-6">
                                    Reflection: {receipt.completion.reflection}
                                </p>
                                <p className="leading-6">
                                    Next challenge:{' '}
                                    {receipt.completion.next_challenge}
                                </p>
                                {receipt.completion.unresolved_questions.map(
                                    (question) => (
                                        <p
                                            key={question}
                                            className="leading-6 text-muted-foreground"
                                        >
                                            Open question: {question}
                                        </p>
                                    ),
                                )}
                            </article>
                        ))}
                    </section>
                )}
            </div>
        </SectionCard>
    );
}
