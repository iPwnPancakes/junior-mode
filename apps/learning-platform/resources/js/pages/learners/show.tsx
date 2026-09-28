import { Form, Head, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ChevronDown,
    ClipboardCheck,
    History,
    LayoutTemplate,
    MoreHorizontal,
    Plus,
    Target,
} from 'lucide-react';
import { useState } from 'react';
import { FocusActions, SetLevelDialog } from '@/components/coaching-focus';
import {
    AddCompetencyDialog,
    ArchiveCompetencyDialog,
    DialogButton,
    EditCompetencyDialog,
    MergeCompetencyDialog,
} from '@/components/competency-dialogs';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { LearningProgress } from '@/components/learning-progress';
import type { LearningReceipt, Progress } from '@/components/learning-progress';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import { update as moveCompetency } from '@/routes/competency-positions';
import { store as copyTemplate } from '@/routes/competency-template-copies';
import { update as updateSettings } from '@/routes/mentor-coaching-settings';
import type {
    AssessmentRecord,
    CoachingFocus,
    CompetencyTemplate,
    PlanCompetency,
    PlanLearner,
} from '@/types/coaching-plan';

type LearningActivity = {
    id: number;
    kind: string;
    session_title: string;
    payload: {
        summary: string;
        reason?: string;
        explanation?: string;
        acceptance_rationale?: string;
    };
};

type Props = {
    learner: PlanLearner;
    canManage: boolean;
    defaultPriorityDurationDays: number;
    competencies: PlanCompetency[];
    templates: CompetencyTemplate[];
    assessments: AssessmentRecord[];
    priorities: CoachingFocus[];
    learningProgress?: Progress;
    learningReceipts?: LearningReceipt[];
    learningActivities?: LearningActivity[];
};

type TreeNode<T> = T & { children: TreeNode<T>[] };

/** Builds a tree while keeping the server's sibling order. */
function buildTree<T extends { id: number; parentId: number | null }>(
    nodes: T[],
): TreeNode<T>[] {
    const childrenByParent = new Map<number | null, T[]>();

    for (const node of nodes) {
        const siblings = childrenByParent.get(node.parentId) ?? [];
        siblings.push(node);
        childrenByParent.set(node.parentId, siblings);
    }

    const attach = (parentId: number | null): TreeNode<T>[] =>
        (childrenByParent.get(parentId) ?? []).map((node) => ({
            ...node,
            children: attach(node.id),
        }));

    return attach(null);
}

function isActive(node: PlanCompetency): boolean {
    return node.archivedAt === null && node.mergedInto === null;
}

function FocusBadge({ focus }: { focus: CoachingFocus }) {
    if (focus.displayStatus === 'expired') {
        return (
            <StatusBadge tone="warning">
                Focus ended {focus.expiresOn}
            </StatusBadge>
        );
    }

    return (
        <StatusBadge tone="success">
            {focus.emphasis === 'high' ? 'High focus' : 'Focus'}
            {focus.expiresOn ? ` until ${focus.expiresOn}` : ''}
        </StatusBadge>
    );
}

type RowDialog = 'edit' | 'add-child' | 'merge' | 'archive' | 'level' | null;

function CompetencyRow({
    learner,
    node,
    siblings,
    allNodes,
    canManage,
    defaultDuration,
}: {
    learner: PlanLearner;
    node: TreeNode<PlanCompetency>;
    siblings: TreeNode<PlanCompetency>[];
    allNodes: PlanCompetency[];
    canManage: boolean;
    defaultDuration: number;
}) {
    const [dialog, setDialog] = useState<RowDialog>(null);
    const active = isActive(node);
    const index = siblings.indexOf(node);
    const dialogProps = (name: RowDialog) => ({
        open: dialog === name,
        onOpenChange: (open: boolean) => setDialog(open ? name : null),
    });
    const move = (direction: 'up' | 'down') =>
        router.patch(
            moveCompetency.url({ learner: learner.id, competency: node.id }),
            { direction },
            { preserveScroll: true },
        );

    return (
        <li className="grid gap-3">
            <article
                aria-label={node.name}
                className="grid min-w-0 gap-3 rounded-lg border bg-background p-4 shadow-xs data-[inactive]:opacity-60"
                data-inactive={active ? undefined : ''}
            >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{node.name}</h3>
                    {node.level && (
                        <StatusBadge tone="info">
                            {node.level.label}
                        </StatusBadge>
                    )}
                    {node.focus && <FocusBadge focus={node.focus} />}
                    {node.archivedAt && (
                        <StatusBadge tone="warning">Archived</StatusBadge>
                    )}
                    {node.mergedInto && (
                        <StatusBadge>
                            Merged into {node.mergedInto.name}
                        </StatusBadge>
                    )}
                </div>
                <p className="text-sm leading-6">{node.definition}</p>
                <Collapsible>
                    <CollapsibleTrigger className="group flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                        <ChevronDown
                            aria-hidden="true"
                            className="size-3.5 transition-transform group-data-[panel-open]:rotate-180"
                        />
                        What counts as demonstrated
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 grid gap-2 rounded-md bg-muted/40 p-3 text-sm leading-6">
                        <p className="whitespace-pre-line">
                            {node.demonstrationCriteria}
                        </p>
                        {node.technologies.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Technologies: {node.technologies.join(', ')}
                            </p>
                        )}
                    </CollapsibleContent>
                </Collapsible>

                {canManage && active && (
                    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                        <FocusActions
                            learnerId={learner.id}
                            competency={node}
                            defaultDuration={defaultDuration}
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDialog('level')}
                        >
                            <ClipboardCheck aria-hidden="true" />
                            {node.level ? 'Update level' : 'Set level'}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label={`More actions for ${node.name}`}
                                    />
                                }
                            >
                                <MoreHorizontal aria-hidden="true" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem
                                    onClick={() => setDialog('edit')}
                                >
                                    Edit details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setDialog('add-child')}
                                >
                                    Add a competency under this
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    disabled={index <= 0}
                                    onClick={() => move('up')}
                                >
                                    <ArrowUp aria-hidden="true" />
                                    Move up
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={index === siblings.length - 1}
                                    onClick={() => move('down')}
                                >
                                    <ArrowDown aria-hidden="true" />
                                    Move down
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    disabled={
                                        allNodes.filter(isActive).length < 2
                                    }
                                    onClick={() => setDialog('merge')}
                                >
                                    Merge into another
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setDialog('archive')}
                                >
                                    Archive
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <SetLevelDialog
                            learnerId={learner.id}
                            competency={node}
                            {...dialogProps('level')}
                        />
                        <EditCompetencyDialog
                            learner={learner}
                            node={node}
                            nodes={allNodes}
                            {...dialogProps('edit')}
                        />
                        <AddCompetencyDialog
                            learner={learner}
                            nodes={allNodes}
                            parent={node}
                            {...dialogProps('add-child')}
                        />
                        <MergeCompetencyDialog
                            learner={learner}
                            node={node}
                            nodes={allNodes}
                            {...dialogProps('merge')}
                        />
                        <ArchiveCompetencyDialog
                            learner={learner}
                            node={node}
                            {...dialogProps('archive')}
                        />
                    </div>
                )}
            </article>

            {node.children.length > 0 && (
                <ul
                    className="ml-3 grid gap-3 border-l pl-3 sm:ml-6 sm:pl-5"
                    aria-label={`Under ${node.name}`}
                >
                    {node.children.map((child) => (
                        <CompetencyRow
                            key={child.id}
                            learner={learner}
                            node={child}
                            siblings={node.children}
                            allNodes={allNodes}
                            canManage={canManage}
                            defaultDuration={defaultDuration}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

function TemplateOption({
    learner,
    template,
}: {
    learner: PlanLearner;
    template: CompetencyTemplate;
}) {
    const tree = buildTree(
        template.nodes.toSorted(
            (left, right) => left.position - right.position,
        ),
    );
    const names = (items: typeof tree, depth = 0): React.ReactNode[] =>
        items.flatMap((node) => [
            <li
                key={node.id}
                style={{ paddingLeft: `${depth * 0.75}rem` }}
                className="text-sm"
            >
                {node.name}
            </li>,
            ...names(node.children, depth + 1),
        ]);

    return (
        <article className="grid gap-3 rounded-lg border bg-background p-4">
            <div>
                <h3 className="font-semibold">{template.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {template.description}
                </p>
            </div>
            <ul className="grid gap-1 text-muted-foreground">{names(tree)}</ul>
            <Form
                {...copyTemplate.form(learner.id)}
                options={{ preserveScroll: true }}
                disableWhileProcessing
            >
                {({ processing }) => (
                    <>
                        <input
                            type="hidden"
                            name="template_id"
                            value={template.id}
                        />
                        <SubmitButton
                            processing={processing}
                            processingLabel="Adding…"
                        >
                            Use this template
                        </SubmitButton>
                    </>
                )}
            </Form>
        </article>
    );
}

function TemplatePicker({
    learner,
    templates,
}: {
    learner: PlanLearner;
    templates: CompetencyTemplate[];
}) {
    return (
        <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
                <TemplateOption
                    key={template.id}
                    learner={learner}
                    template={template}
                />
            ))}
        </div>
    );
}

function ActivityList({ activities }: { activities: LearningActivity[] }) {
    return (
        <div className="grid gap-3">
            {activities.map((activity) => (
                <article
                    key={activity.id}
                    className="rounded-md border p-3 text-sm"
                >
                    <h3 className="font-medium">
                        {activity.kind.replaceAll('_', ' ')} ·{' '}
                        {activity.session_title}
                    </h3>
                    <p className="mt-1">{activity.payload.summary}</p>
                    {activity.payload.acceptance_rationale && (
                        <p className="mt-1">
                            Accepted because:{' '}
                            {activity.payload.acceptance_rationale}
                        </p>
                    )}
                    {activity.payload.reason && (
                        <p className="mt-1">
                            Reason:{' '}
                            {activity.payload.reason.replaceAll('_', ' ')}
                        </p>
                    )}
                    {activity.payload.explanation && (
                        <p className="mt-1">{activity.payload.explanation}</p>
                    )}
                    {activity.kind === 'solution_escape' && (
                        <p className="mt-1 text-muted-foreground">
                            Evidence from this Session can support Guided
                            progress at most. Agent-provided solutions do not
                            demonstrate independence.
                        </p>
                    )}
                </article>
            ))}
        </div>
    );
}

function HistoryCard({
    canManage,
    defaultDuration,
    assessments,
    pastFocuses,
}: {
    canManage: boolean;
    defaultDuration: number;
    assessments: AssessmentRecord[];
    pastFocuses: CoachingFocus[];
}) {
    return (
        <SectionCard title="History" icon={History}>
            <Collapsible>
                <CollapsibleTrigger
                    render={
                        <Button variant="outline" size="sm" className="group" />
                    }
                >
                    <ChevronDown
                        aria-hidden="true"
                        className="transition-transform group-data-[panel-open]:rotate-180"
                    />
                    Show past focuses and level changes
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 grid gap-6 lg:grid-cols-2">
                    <section aria-label="Past focuses" className="grid gap-2">
                        <h3 className="text-sm font-medium">Past focuses</h3>
                        {pastFocuses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                None yet.
                            </p>
                        ) : (
                            <ul className="grid gap-2">
                                {pastFocuses.map((focus) => (
                                    <li
                                        key={focus.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                                    >
                                        <span>{focus.competencyName}</span>
                                        <StatusBadge>
                                            {focus.displayStatusLabel}
                                            {focus.resolvedAt
                                                ? ` · ${focus.resolvedAt}`
                                                : ''}
                                        </StatusBadge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                    <section aria-label="Level changes" className="grid gap-2">
                        <h3 className="text-sm font-medium">Level changes</h3>
                        {assessments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                None yet.
                            </p>
                        ) : (
                            <ul className="grid gap-2">
                                {assessments.map((assessment) => (
                                    <li
                                        key={assessment.id}
                                        className="grid gap-1 rounded-md border p-3 text-sm"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-medium">
                                                {assessment.competencyName}
                                            </span>
                                            <StatusBadge tone="info">
                                                {assessment.levelLabel}
                                            </StatusBadge>
                                        </div>
                                        {assessment.rationale && (
                                            <p>{assessment.rationale}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {assessment.assessedBy} ·{' '}
                                            {assessment.assessedAt}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                    {canManage && (
                        <Form
                            {...updateSettings.form()}
                            options={{ preserveScroll: true }}
                            className="grid max-w-xs gap-3 lg:col-span-2"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <FormField
                                        id="default-priority-duration"
                                        label="Default focus length (days)"
                                        error={
                                            errors.default_priority_duration_days
                                        }
                                        description="Used by Focus coaching here and Extend, for all your learners."
                                    >
                                        <Input
                                            id="default-priority-duration"
                                            name="default_priority_duration_days"
                                            type="number"
                                            min={1}
                                            max={365}
                                            defaultValue={defaultDuration}
                                            required
                                        />
                                    </FormField>
                                    <SubmitButton processing={processing}>
                                        Save
                                    </SubmitButton>
                                </>
                            )}
                        </Form>
                    )}
                </CollapsibleContent>
            </Collapsible>
        </SectionCard>
    );
}

export default function LearnerPage({
    learner,
    canManage,
    defaultPriorityDurationDays,
    competencies,
    templates,
    assessments,
    priorities,
    learningProgress,
    learningReceipts = [],
    learningActivities = [],
}: Props) {
    const tree = buildTree(competencies);
    const pastFocuses = priorities.filter(
        (priority) => priority.status !== 'active',
    );

    return (
        <>
            <Head title={canManage ? learner.name : 'Your coaching plan'} />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    eyebrow={canManage ? 'Learner' : 'Your coaching plan'}
                    title={canManage ? learner.name : 'Your coaching plan'}
                    description={
                        canManage
                            ? learner.email
                            : 'What you are growing and what coaching will look for.'
                    }
                    actions={
                        canManage && tree.length > 0 ? (
                            <DialogButton
                                label="Add competency"
                                icon={<Plus aria-hidden="true" />}
                            >
                                {(dialog) => (
                                    <AddCompetencyDialog
                                        learner={learner}
                                        nodes={competencies}
                                        {...dialog}
                                    />
                                )}
                            </DialogButton>
                        ) : undefined
                    }
                />

                <SectionCard
                    title="Coaching plan"
                    description={
                        canManage
                            ? 'Pick a competency to focus coaching on. Set a level whenever you have a view on how it is going.'
                            : 'Competencies your mentor chose, with their current focus and level.'
                    }
                    icon={Target}
                >
                    {tree.length === 0 ? (
                        <div className="grid gap-4">
                            <EmptyState
                                icon={LayoutTemplate}
                                title="No competencies yet"
                                description={
                                    canManage
                                        ? 'Start from a template and adjust it, or add your own.'
                                        : 'Your mentor has not set up your plan yet.'
                                }
                            />
                            {canManage && (
                                <>
                                    <TemplatePicker
                                        learner={learner}
                                        templates={templates}
                                    />
                                    <div>
                                        <DialogButton
                                            label="Add your own competency"
                                            variant="outline"
                                            icon={<Plus aria-hidden="true" />}
                                        >
                                            {(dialog) => (
                                                <AddCompetencyDialog
                                                    learner={learner}
                                                    nodes={competencies}
                                                    {...dialog}
                                                />
                                            )}
                                        </DialogButton>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <ul
                                className="grid gap-3"
                                aria-label="Competencies"
                            >
                                {tree.map((node) => (
                                    <CompetencyRow
                                        key={node.id}
                                        learner={learner}
                                        node={node}
                                        siblings={tree}
                                        allNodes={competencies}
                                        canManage={canManage}
                                        defaultDuration={
                                            defaultPriorityDurationDays
                                        }
                                    />
                                ))}
                            </ul>
                            {canManage && templates.length > 0 && (
                                <Collapsible>
                                    <CollapsibleTrigger
                                        render={
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="group w-fit"
                                            />
                                        }
                                    >
                                        <ChevronDown
                                            aria-hidden="true"
                                            className="transition-transform group-data-[panel-open]:rotate-180"
                                        />
                                        Add more from a template
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-3">
                                        <TemplatePicker
                                            learner={learner}
                                            templates={templates}
                                        />
                                    </CollapsibleContent>
                                </Collapsible>
                            )}
                        </div>
                    )}
                </SectionCard>

                {learningProgress && (
                    <LearningProgress
                        progress={learningProgress}
                        receipts={learningReceipts}
                    />
                )}

                {learningActivities.length > 0 && (
                    <SectionCard
                        title="Coaching activity"
                        description="Requested hints, accepted attempts and Solution Escapes remain visible in the learning record."
                    >
                        <ActivityList activities={learningActivities} />
                    </SectionCard>
                )}

                <HistoryCard
                    canManage={canManage}
                    defaultDuration={defaultPriorityDurationDays}
                    assessments={assessments}
                    pastFocuses={pastFocuses}
                />
            </div>
        </>
    );
}

LearnerPage.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
