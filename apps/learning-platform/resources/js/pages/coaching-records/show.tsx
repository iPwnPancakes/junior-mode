import { Form, Head, Link } from '@inertiajs/react';
import { BookOpen, CalendarClock, ClipboardCheck, Target } from 'lucide-react';
import { useState } from 'react';
import { LearningProgress, type Progress, type LearningReceipt } from '@/components/learning-progress';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { SubmitButton } from '@/components/submit-button';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';
import { store as storeAssessment } from '@/routes/assessments';
import {
    store as storePriority,
    update as updatePriority,
} from '@/routes/coaching-priorities';
import { store as renewPriority } from '@/routes/coaching-priority-renewals';
import { store as replacePriority } from '@/routes/coaching-priority-replacements';
import { store as resolvePriority } from '@/routes/coaching-priority-resolutions';
import { show as showCatalog } from '@/routes/competency-catalogs';
import { update as updateSettings } from '@/routes/mentor-coaching-settings';

type Learner = { id: number; name: string; email: string };
type Competency = { id: number; name: string };
type Assessment = {
    id: number;
    competencyName: string;
    level: string;
    levelLabel: string;
    rationale: string | null;
    assessedBy: string;
    assessedAt: string;
};
type Priority = {
    id: number;
    competencyId: number;
    competencyName: string;
    emphasis: 'normal' | 'high';
    expirationMode: ExpirationMode;
    expiresOn: string | null;
    status: string;
    displayStatus: string;
    displayStatusLabel: string;
    note: string | null;
    createdAt: string | null;
    resolvedAt: string | null;
    replacement: { id: number; competencyName: string } | null;
};
type ExpirationMode = 'default_duration' | 'custom_date' | 'until_removed';
type Props = {
    learner: Learner;
    learningProgress?: Progress;
    learningReceipts?: LearningReceipt[];
    canManage: boolean;
    defaultPriorityDurationDays: number;
    competencies: Competency[];
    assessments: Assessment[];
    priorities: Priority[];
};

const selectClasses =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

function ExpirationFields({
    prefix,
    defaultMode,
    defaultExpiresOn,
    defaultDuration,
    errors,
}: {
    prefix: string;
    defaultMode: ExpirationMode;
    defaultExpiresOn?: string | null;
    defaultDuration: number;
    errors: Record<string, string>;
}) {
    const [mode, setMode] = useState<ExpirationMode>(defaultMode);

    return (
        <>
            <FormField
                id={`${prefix}-expiration-mode`}
                label="Expiration"
                error={errors.expiration_mode}
                description={`The default duration is ${defaultDuration} days.`}
            >
                <select
                    id={`${prefix}-expiration-mode`}
                    name="expiration_mode"
                    value={mode}
                    onChange={(event) =>
                        setMode(event.target.value as ExpirationMode)
                    }
                    className={selectClasses}
                    aria-describedby={
                        errors.expiration_mode
                            ? `${prefix}-expiration-mode-error`
                            : `${prefix}-expiration-mode-description`
                    }
                >
                    <option value="default_duration">
                        Use default ({defaultDuration} days)
                    </option>
                    <option value="custom_date">Choose a date</option>
                    <option value="until_removed">Until removed</option>
                </select>
            </FormField>
            {mode === 'custom_date' && (
                <FormField
                    id={`${prefix}-expires-on`}
                    label="Expires on"
                    error={errors.expires_on}
                >
                    <Input
                        id={`${prefix}-expires-on`}
                        name="expires_on"
                        type="date"
                        defaultValue={defaultExpiresOn ?? ''}
                        required
                    />
                </FormField>
            )}
        </>
    );
}

function PriorityFields({
    prefix,
    competencies,
    defaultDuration,
    errors,
    priority,
    includeCompetency = true,
}: {
    prefix: string;
    competencies: Competency[];
    defaultDuration: number;
    errors: Record<string, string>;
    priority?: Priority;
    includeCompetency?: boolean;
}) {
    return (
        <>
            {includeCompetency && (
                <FormField
                    id={`${prefix}-competency`}
                    label="Competency"
                    error={errors.competency_id}
                >
                    <select
                        id={`${prefix}-competency`}
                        name="competency_id"
                        className={selectClasses}
                        defaultValue={priority?.competencyId ?? ''}
                        required
                    >
                        <option value="" disabled>
                            Select a Competency
                        </option>
                        {competencies.map((competency) => (
                            <option key={competency.id} value={competency.id}>
                                {competency.name}
                            </option>
                        ))}
                    </select>
                </FormField>
            )}
            <FormField
                id={`${prefix}-emphasis`}
                label="Emphasis"
                error={errors.emphasis}
            >
                <select
                    id={`${prefix}-emphasis`}
                    name="emphasis"
                    className={selectClasses}
                    defaultValue={priority?.emphasis ?? 'normal'}
                >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                </select>
            </FormField>
            <ExpirationFields
                prefix={prefix}
                defaultMode={priority?.expirationMode ?? 'default_duration'}
                defaultExpiresOn={priority?.expiresOn}
                defaultDuration={defaultDuration}
                errors={errors}
            />
            <FormField
                id={`${prefix}-note`}
                label="Coaching note"
                error={errors.note}
                optional
            >
                <Textarea
                    id={`${prefix}-note`}
                    name="note"
                    defaultValue={priority?.note ?? ''}
                    rows={3}
                />
            </FormField>
        </>
    );
}

function statusTone(
    status: string,
): 'neutral' | 'info' | 'success' | 'warning' {
    if (status === 'active' || status === 'persistent') {
        return 'success';
    }

    if (status === 'expired') {
        return 'warning';
    }

    if (status === 'sufficiently_demonstrated') {
        return 'info';
    }

    return 'neutral';
}

export default function CoachingRecord({
    learner,
    canManage,
    defaultPriorityDurationDays,
    competencies,
    assessments,
    priorities,
    learningProgress,
    learningReceipts = [],
}: Props) {
    return (
        <>
            <Head title={`${learner.name} coaching record`} />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    eyebrow="Development record"
                    title={`${learner.name}'s Coaching Record`}
                    description="Assess current proficiency separately from where future coaching should focus."
                    actions={
                        <Link
                            href={showCatalog(learner.id)}
                            className={buttonVariants({ variant: 'outline' })}
                        >
                            <BookOpen aria-hidden="true" />
                            Open catalog
                        </Link>
                    }
                />

                {learningProgress && <LearningProgress progress={learningProgress} receipts={learningReceipts} />}

                {canManage && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <SectionCard
                            title="Record an Assessment"
                            description="Your current judgment; it does not activate a Coaching Priority or replace evidence."
                            icon={ClipboardCheck}
                        >
                            <Form
                                {...storeAssessment.form(learner.id)}
                                resetOnSuccess
                                disableWhileProcessing
                                className="grid gap-4"
                            >
                                {({ errors, processing }) => (
                                    <>
                                        <FormField
                                            id="assessment-competency"
                                            label="Competency"
                                            error={errors.competency_id}
                                        >
                                            <select
                                                id="assessment-competency"
                                                name="competency_id"
                                                className={selectClasses}
                                                defaultValue=""
                                                required
                                            >
                                                <option value="" disabled>
                                                    Select a Competency
                                                </option>
                                                {competencies.map(
                                                    (competency) => (
                                                        <option
                                                            key={competency.id}
                                                            value={
                                                                competency.id
                                                            }
                                                        >
                                                            {competency.name}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </FormField>
                                        <FormField
                                            id="assessment-level"
                                            label="Assessment"
                                            error={errors.level}
                                        >
                                            <select
                                                id="assessment-level"
                                                name="level"
                                                className={selectClasses}
                                                defaultValue="not_yet_observed"
                                            >
                                                <option value="not_yet_observed">
                                                    Not yet observed
                                                </option>
                                                <option value="developing">
                                                    Developing
                                                </option>
                                                <option value="consistent">
                                                    Consistent
                                                </option>
                                                <option value="independent">
                                                    Independent
                                                </option>
                                            </select>
                                        </FormField>
                                        <FormField
                                            id="assessment-rationale"
                                            label="Rationale"
                                            error={errors.rationale}
                                            optional
                                        >
                                            <Textarea
                                                id="assessment-rationale"
                                                name="rationale"
                                                rows={3}
                                            />
                                        </FormField>
                                        <SubmitButton processing={processing}>
                                            Record Assessment
                                        </SubmitButton>
                                    </>
                                )}
                            </Form>
                        </SectionCard>

                        <SectionCard
                            title="Activate a Coaching Priority"
                            description="Direct future coaching without changing the current Assessment."
                            icon={Target}
                        >
                            <Form
                                {...storePriority.form(learner.id)}
                                resetOnSuccess
                                disableWhileProcessing
                                className="grid gap-4"
                            >
                                {({ errors, processing }) => (
                                    <>
                                        <PriorityFields
                                            prefix="new-priority"
                                            competencies={competencies}
                                            defaultDuration={
                                                defaultPriorityDurationDays
                                            }
                                            errors={errors}
                                        />
                                        <SubmitButton processing={processing}>
                                            Activate Priority
                                        </SubmitButton>
                                    </>
                                )}
                            </Form>
                        </SectionCard>
                    </div>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
                    <SectionCard
                        title="Coaching Priorities"
                        description="Active, persistent, expired, and resolved directions remain visibly distinct."
                        icon={Target}
                    >
                        {priorities.length === 0 ? (
                            <EmptyState
                                icon={Target}
                                title="No Coaching Priorities"
                                description="A Mentor can activate a precise focus independently of an Assessment."
                            />
                        ) : (
                            <ul
                                className="grid gap-3"
                                aria-label="Coaching Priorities"
                            >
                                {priorities.map((priority) => (
                                    <li
                                        key={priority.id}
                                        className="grid gap-3 rounded-lg border bg-background p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-medium">
                                                    {priority.competencyName}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {priority.emphasis ===
                                                    'high'
                                                        ? 'High emphasis'
                                                        : 'Normal emphasis'}
                                                    {priority.expiresOn
                                                        ? ` · Expires ${priority.expiresOn}`
                                                        : ' · No expiration'}
                                                </p>
                                            </div>
                                            <StatusBadge
                                                tone={statusTone(
                                                    priority.displayStatus,
                                                )}
                                            >
                                                {priority.displayStatusLabel}
                                            </StatusBadge>
                                        </div>
                                        {priority.note && (
                                            <p className="text-sm">
                                                {priority.note}
                                            </p>
                                        )}
                                        {priority.replacement && (
                                            <p className="text-sm text-muted-foreground">
                                                Replaced by{' '}
                                                {
                                                    priority.replacement
                                                        .competencyName
                                                }
                                            </p>
                                        )}
                                        {canManage &&
                                            priority.status === 'active' && (
                                                <div className="flex flex-wrap gap-2 border-t pt-3">
                                                    <PriorityDialog
                                                        title={`Refine ${priority.competencyName}`}
                                                        trigger="Refine"
                                                    >
                                                        <Form
                                                            {...updatePriority.form(
                                                                {
                                                                    learner:
                                                                        learner.id,
                                                                    coachingPriority:
                                                                        priority.id,
                                                                },
                                                            )}
                                                            className="grid gap-4"
                                                        >
                                                            {({
                                                                errors,
                                                                processing,
                                                            }) => (
                                                                <>
                                                                    <PriorityFields
                                                                        prefix={`refine-${priority.id}`}
                                                                        competencies={
                                                                            competencies
                                                                        }
                                                                        defaultDuration={
                                                                            defaultPriorityDurationDays
                                                                        }
                                                                        errors={
                                                                            errors
                                                                        }
                                                                        priority={
                                                                            priority
                                                                        }
                                                                        includeCompetency={
                                                                            false
                                                                        }
                                                                    />
                                                                    <SubmitButton
                                                                        processing={
                                                                            processing
                                                                        }
                                                                    >
                                                                        Save
                                                                        refinement
                                                                    </SubmitButton>
                                                                </>
                                                            )}
                                                        </Form>
                                                    </PriorityDialog>
                                                    <PriorityDialog
                                                        title={`Renew ${priority.competencyName}`}
                                                        trigger="Renew"
                                                    >
                                                        <Form
                                                            {...renewPriority.form(
                                                                {
                                                                    learner:
                                                                        learner.id,
                                                                    coachingPriority:
                                                                        priority.id,
                                                                },
                                                            )}
                                                            className="grid gap-4"
                                                        >
                                                            {({
                                                                errors,
                                                                processing,
                                                            }) => (
                                                                <>
                                                                    <ExpirationFields
                                                                        prefix={`renew-${priority.id}`}
                                                                        defaultMode="default_duration"
                                                                        defaultDuration={
                                                                            defaultPriorityDurationDays
                                                                        }
                                                                        errors={
                                                                            errors
                                                                        }
                                                                    />
                                                                    <SubmitButton
                                                                        processing={
                                                                            processing
                                                                        }
                                                                    >
                                                                        Renew
                                                                        Priority
                                                                    </SubmitButton>
                                                                </>
                                                            )}
                                                        </Form>
                                                    </PriorityDialog>
                                                    <PriorityDialog
                                                        title={`Replace ${priority.competencyName}`}
                                                        trigger="Replace"
                                                    >
                                                        <Form
                                                            {...replacePriority.form(
                                                                {
                                                                    learner:
                                                                        learner.id,
                                                                    coachingPriority:
                                                                        priority.id,
                                                                },
                                                            )}
                                                            className="grid gap-4"
                                                        >
                                                            {({
                                                                errors,
                                                                processing,
                                                            }) => (
                                                                <>
                                                                    <PriorityFields
                                                                        prefix={`replace-${priority.id}`}
                                                                        competencies={
                                                                            competencies
                                                                        }
                                                                        defaultDuration={
                                                                            defaultPriorityDurationDays
                                                                        }
                                                                        errors={
                                                                            errors
                                                                        }
                                                                    />
                                                                    <SubmitButton
                                                                        processing={
                                                                            processing
                                                                        }
                                                                    >
                                                                        Replace
                                                                        Priority
                                                                    </SubmitButton>
                                                                </>
                                                            )}
                                                        </Form>
                                                    </PriorityDialog>
                                                    <ResolutionForm
                                                        learnerId={learner.id}
                                                        priorityId={priority.id}
                                                        status="sufficiently_demonstrated"
                                                        label="Sufficiently demonstrated"
                                                    />
                                                    <ResolutionForm
                                                        learnerId={learner.id}
                                                        priorityId={priority.id}
                                                        status="closed"
                                                        label="Close"
                                                    />
                                                </div>
                                            )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionCard>

                    <div className="grid h-fit gap-6">
                        <SectionCard
                            title="Assessments"
                            description="Mentor judgments remain separate from current evidence and priorities."
                            icon={ClipboardCheck}
                        >
                            {assessments.length === 0 ? (
                                <EmptyState
                                    icon={ClipboardCheck}
                                    title="No Assessments"
                                    description="No current proficiency judgments have been recorded."
                                />
                            ) : (
                                <ul
                                    className="grid gap-3"
                                    aria-label="Assessments"
                                >
                                    {assessments.map((assessment) => (
                                        <li
                                            key={assessment.id}
                                            className="grid gap-2 rounded-lg border bg-background p-3"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="font-medium">
                                                    {assessment.competencyName}
                                                </p>
                                                <StatusBadge tone="info">
                                                    {assessment.levelLabel}
                                                </StatusBadge>
                                            </div>
                                            {assessment.rationale && (
                                                <p className="text-sm">
                                                    {assessment.rationale}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {assessment.assessedBy} ·{' '}
                                                {assessment.assessedAt}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </SectionCard>

                        {canManage && (
                            <SectionCard
                                title="Priority default"
                                description="Used when a new or renewed priority follows your standard cadence."
                                icon={CalendarClock}
                            >
                                <Form
                                    {...updateSettings.form()}
                                    className="grid gap-4"
                                >
                                    {({ errors, processing }) => (
                                        <>
                                            <FormField
                                                id="default-priority-duration"
                                                label="Default duration in days"
                                                error={
                                                    errors.default_priority_duration_days
                                                }
                                            >
                                                <Input
                                                    id="default-priority-duration"
                                                    name="default_priority_duration_days"
                                                    type="number"
                                                    min={1}
                                                    max={365}
                                                    defaultValue={
                                                        defaultPriorityDurationDays
                                                    }
                                                    required
                                                />
                                            </FormField>
                                            <SubmitButton
                                                processing={processing}
                                            >
                                                Save default
                                            </SubmitButton>
                                        </>
                                    )}
                                </Form>
                            </SectionCard>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function PriorityDialog({
    title,
    trigger,
    children,
}: {
    title: string;
    trigger: string;
    children: React.ReactNode;
}) {
    return (
        <Dialog>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
                {trigger}
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>
                    Adjust future coaching direction while preserving its
                    history.
                </DialogDescription>
                {children}
            </DialogContent>
        </Dialog>
    );
}

function ResolutionForm({
    learnerId,
    priorityId,
    status,
    label,
}: {
    learnerId: number;
    priorityId: number;
    status: 'closed' | 'sufficiently_demonstrated';
    label: string;
}) {
    return (
        <Form
            {...resolvePriority.form({
                learner: learnerId,
                coachingPriority: priorityId,
            })}
        >
            {({ processing }) => (
                <>
                    <input type="hidden" name="status" value={status} />
                    <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={processing}
                    >
                        {label}
                    </Button>
                </>
            )}
        </Form>
    );
}

CoachingRecord.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Coaching record', href: '#' },
    ],
};
