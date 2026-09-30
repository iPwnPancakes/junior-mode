import { Form, Head, usePage } from '@inertiajs/react';
import {
    Briefcase,
    ExternalLink,
    Info,
    Lightbulb,
    MessageCircleQuestion,
    Send,
    TrendingUp,
    TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { SubmitButton } from '@/components/submit-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { index, share } from '@/routes/handoffs';

type Value =
    string | number | boolean | null | Value[] | { [key: string]: Value };
type Props = {
    handoff: {
        id: number;
        payload: {
            facts: Record<string, Value>;
            likely_knowledge_gap?: Value;
            agent_hypotheses?: string[];
            mentor_questions?: string[];
            progress?: Value;
        };
        sharedAt: string | null;
    };
    learnerName?: string;
    canShare: boolean;
    mentorName: string | null;
    previewToken: string | null;
};

type ProgressCompetency = {
    name?: string;
    stage?: string;
    has_evidence?: boolean;
    next_stage_requirement?: string;
    supporting_evidence?: unknown[];
};

/** Facts rendered in purpose-built sections; anything else still appears below. */
const knownFacts = [
    'task',
    'repository',
    'learning_objective',
    'desired_outcome',
    'current_understanding',
    'exact_error_or_unexpected_behavior',
    'attempts',
    'relevant_artifacts',
    'source',
];

const stageTones: Record<string, 'neutral' | 'info' | 'success'> = {
    introduced: 'neutral',
    guided: 'info',
    independent: 'success',
    transferable: 'success',
};

const text = (value: Value | undefined): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value : null;

const list = (value: Value | undefined): string[] =>
    Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string')
        : [];

const record = (value: Value | undefined): Record<string, Value> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};

const headline = (key: string) =>
    key.charAt(0).toUpperCase() + key.slice(1).replaceAll('_', ' ');

function Details({ value }: { value: Value }) {
    if (value === null) {
        return <span>Not recorded</span>;
    }

    if (Array.isArray(value)) {
        return value.length ? (
            <ul className="list-disc space-y-1 pl-5">
                {value.map((entry, i) => (
                    <li key={i}>
                        <Details value={entry} />
                    </li>
                ))}
            </ul>
        ) : (
            <span>None recorded</span>
        );
    }

    if (typeof value === 'object') {
        return (
            <dl className="space-y-2">
                {Object.entries(value).map(([key, entry]) => (
                    <div key={key}>
                        <dt className="font-medium text-foreground">
                            {headline(key)}
                        </dt>
                        <dd className="whitespace-pre-wrap text-muted-foreground">
                            <Details value={entry} />
                        </dd>
                    </div>
                ))}
            </dl>
        );
    }

    return <span>{String(value)}</span>;
}

function Field({
    label,
    children,
    className,
}: {
    label: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={className}>
            <dt className="text-xs font-medium text-muted-foreground">
                {label}
            </dt>
            <dd className="mt-1 text-sm leading-6 whitespace-pre-wrap">
                {children}
            </dd>
        </div>
    );
}

function BulletList({
    items,
    ordered = false,
    mono = false,
}: {
    items: string[];
    ordered?: boolean;
    mono?: boolean;
}) {
    if (items.length === 0) {
        return <span className="text-muted-foreground">None recorded</span>;
    }

    const ListTag = ordered ? 'ol' : 'ul';

    return (
        <ListTag
            className={
                ordered
                    ? 'list-decimal space-y-2 pl-5'
                    : 'list-disc space-y-1 pl-5'
            }
        >
            {items.map((item, i) => (
                <li
                    key={i}
                    className={mono ? 'font-mono text-xs break-all' : undefined}
                >
                    {item}
                </li>
            ))}
        </ListTag>
    );
}

function ProgressSummary({ progress }: { progress: Value | undefined }) {
    const details = record(progress);
    const competencies = Array.isArray(details.competencies)
        ? (details.competencies as ProgressCompetency[])
        : [];

    if (competencies.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                No progress is included in this snapshot.
            </p>
        );
    }

    return (
        <ul className="grid gap-3">
            {competencies.map((competency, i) => {
                const stage = competency.stage ?? 'introduced';
                const evidenceCount =
                    competency.supporting_evidence?.length ?? 0;

                return (
                    <li
                        key={i}
                        className="grid gap-1.5 rounded-lg border bg-background p-4 text-sm"
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                                {competency.name}
                            </span>
                            <StatusBadge tone={stageTones[stage] ?? 'neutral'}>
                                {headline(stage)}
                            </StatusBadge>
                        </div>
                        {competency.next_stage_requirement && (
                            <p className="leading-6 text-muted-foreground">
                                Next: {competency.next_stage_requirement}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            {evidenceCount === 0
                                ? 'No supporting observations yet'
                                : `${evidenceCount} supporting ${evidenceCount === 1 ? 'observation' : 'observations'}`}
                        </p>
                    </li>
                );
            })}
        </ul>
    );
}

export default function Handoff({
    handoff,
    learnerName,
    canShare,
    mentorName,
    previewToken,
}: Props) {
    const { auth } = usePage().props;
    const isMentor = auth.user?.role === 'mentor';
    const { facts, mentor_questions, agent_hypotheses } = handoff.payload;
    const task = record(facts.task);
    const repository = record(facts.repository);
    const reference = text(task.reference);
    const gap = record(handoff.payload.likely_knowledge_gap);
    const gapSummary =
        text(gap.summary) ?? text(handoff.payload.likely_knowledge_gap);
    const otherFacts = Object.entries(facts).filter(
        ([key]) => !knownFacts.includes(key),
    );
    const progress = record(handoff.payload.progress);
    const title = text(task.title) ?? 'Review handoff';

    return (
        <>
            <Head title={title} />
            <div className="flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    eyebrow={
                        isMentor && learnerName
                            ? `Handoff from ${learnerName}`
                            : 'Handoff'
                    }
                    title={title}
                    description={
                        handoff.sharedAt
                            ? `Shared on ${handoff.sharedAt}. This snapshot cannot be changed.`
                            : 'Private preview. Review every field, including the progress summary, before choosing to share.'
                    }
                    actions={
                        handoff.sharedAt ? (
                            <StatusBadge tone="success">Shared</StatusBadge>
                        ) : (
                            <StatusBadge tone="warning">
                                Private preview
                            </StatusBadge>
                        )
                    }
                />

                <SectionCard title="Work context" icon={Briefcase}>
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <Field label="Work Item">
                            {reference ? (
                                <a
                                    href={reference}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                                >
                                    {text(task.title) ?? reference}
                                    <ExternalLink
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                </a>
                            ) : (
                                (text(task.title) ?? 'Not recorded')
                            )}
                        </Field>
                        <Field label="Repository">
                            {text(repository.name) ?? 'Not recorded'}
                        </Field>
                        <Field label="Learning Objective">
                            {text(facts.learning_objective) ?? 'Not recorded'}
                        </Field>
                        <Field label="Desired outcome">
                            {text(facts.desired_outcome) ?? 'Not recorded'}
                        </Field>
                    </dl>
                </SectionCard>

                <SectionCard
                    title={
                        isMentor
                            ? 'Questions for you'
                            : `Questions for ${mentorName ?? 'your Mentor'}`
                    }
                    icon={MessageCircleQuestion}
                >
                    <div className="text-sm leading-6">
                        <BulletList items={mentor_questions ?? []} ordered />
                    </div>
                </SectionCard>

                <SectionCard
                    title="Where the work is stuck"
                    icon={TriangleAlert}
                >
                    <dl className="grid gap-4">
                        <Field label="Current understanding">
                            {text(facts.current_understanding) ??
                                'Not recorded'}
                        </Field>
                        <Field label="Exact error or unexpected behavior">
                            {text(facts.exact_error_or_unexpected_behavior) ? (
                                <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs leading-5 break-words whitespace-pre-wrap">
                                    {text(
                                        facts.exact_error_or_unexpected_behavior,
                                    )}
                                </code>
                            ) : (
                                'Not recorded'
                            )}
                        </Field>
                        <Field label="Attempts so far">
                            <BulletList items={list(facts.attempts)} />
                        </Field>
                        <Field label="Relevant artifacts">
                            <BulletList
                                items={list(facts.relevant_artifacts)}
                                mono
                            />
                        </Field>
                        {otherFacts.map(([key, value]) => (
                            <Field key={key} label={headline(key)}>
                                <Details value={value} />
                            </Field>
                        ))}
                    </dl>
                    {text(facts.source) && (
                        <p className="mt-4 text-xs text-muted-foreground">
                            {text(facts.source)}
                        </p>
                    )}
                </SectionCard>

                <SectionCard title="Hypotheses to check" icon={Lightbulb}>
                    <dl className="grid gap-4">
                        <Field label="Likely knowledge gap">
                            {gapSummary ?? 'Not recorded'}
                        </Field>
                        <Field label="Agent hypotheses">
                            <BulletList items={agent_hypotheses ?? []} />
                        </Field>
                    </dl>
                </SectionCard>

                <SectionCard
                    title="Evidence-backed progress"
                    description={
                        text(progress.scope) ??
                        'Progress included in this snapshot.'
                    }
                    icon={TrendingUp}
                >
                    <ProgressSummary progress={handoff.payload.progress} />
                </SectionCard>

                {!handoff.sharedAt && (
                    <Alert variant="info">
                        <Info aria-hidden="true" />
                        <AlertDescription>
                            After Mentor help, record what changed in your
                            understanding as a reflection or verified learning
                            evidence in this Coaching Session. Asking for help
                            does not lower progress.
                        </AlertDescription>
                    </Alert>
                )}

                {canShare && (
                    <Form {...share.form(handoff.id)}>
                        {({ processing, errors }) => (
                            <SectionCard
                                title={`Share with ${mentorName}`}
                                description="This makes the snapshot available to your Mentor in Junior Mode. No message is sent. If anything is inaccurate, ask Junior Mode to generate a corrected preview before sharing."
                                icon={Send}
                                contentClassName="grid gap-4"
                            >
                                <input
                                    type="hidden"
                                    name="preview_token"
                                    value={previewToken ?? ''}
                                />
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="handoff-reviewed"
                                        name="reviewed"
                                        value="1"
                                        required
                                        aria-labelledby="handoff-reviewed-label"
                                        className="mt-0.5"
                                    />
                                    <Label
                                        id="handoff-reviewed-label"
                                        htmlFor="handoff-reviewed"
                                        className="leading-5 font-normal"
                                    >
                                        I reviewed this exact snapshot and
                                        choose to share it with {mentorName}.
                                    </Label>
                                </div>
                                {Object.values(errors).map((error) => (
                                    <p
                                        role="alert"
                                        key={error}
                                        className="text-sm text-destructive"
                                    >
                                        {error}
                                    </p>
                                ))}
                                <SubmitButton
                                    processing={processing}
                                    processingLabel="Sharing…"
                                    className="w-fit"
                                >
                                    Share with {mentorName}
                                </SubmitButton>
                            </SectionCard>
                        )}
                    </Form>
                )}
                {!canShare && !handoff.sharedAt && (
                    <p className="text-sm text-muted-foreground">
                        An active Mentor relationship is required to share this
                        handoff.
                    </p>
                )}
            </div>
        </>
    );
}

Handoff.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Handoffs', href: index() },
        {
            title:
                text(record(props.handoff.payload.facts.task).title) ??
                'Review handoff',
            href: '#',
        },
    ],
});
