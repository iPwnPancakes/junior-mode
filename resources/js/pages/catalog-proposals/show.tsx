import { Form, Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    Check,
    ClipboardCheck,
    Code2,
    GitBranch,
    Pencil,
    Plus,
    Target,
    Trash2,
    X,
} from 'lucide-react';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { SubmitButton } from '@/components/submit-button';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';
import { store as decideAssessment } from '@/routes/baseline-assessment-proposal-decisions';
import { store as decideProposal } from '@/routes/catalog-proposal-decisions';
import {
    destroy as destroyNode,
    store as storeNode,
    update as updateNode,
} from '@/routes/catalog-proposal-nodes';
import { update as updateSelection } from '@/routes/catalog-proposal-selections';
import { show as showCatalog } from '@/routes/competency-catalogs';

type Learner = { id: number; name: string; email: string };

type ProposalNode = {
    id: number;
    parentId: number | null;
    position: number;
    name: string;
    definition: string;
    demonstrationCriteria: string;
    prerequisites: string[];
    workOpportunities: string[];
    technologies: string[];
    selected: boolean;
    copiedCompetencyId: number | null;
};

type BaselineAssessment = {
    id: number;
    nodeId: number;
    nodeName: string;
    level: string;
    rationale: string | null;
    decision: string;
    applied: boolean;
};

type Proposal = {
    id: number;
    status: string;
    submittedAt: string | null;
    interviewContext: Record<string, string[]>;
    clientName: string;
    nodes: ProposalNode[];
    baselineAssessments: BaselineAssessment[];
};

type TreeNode = ProposalNode & { children: TreeNode[] };

function buildTree(nodes: ProposalNode[]): TreeNode[] {
    const byParent = new Map<number | null, ProposalNode[]>();

    for (const node of nodes) {
        byParent.set(node.parentId, [
            ...(byParent.get(node.parentId) ?? []),
            node,
        ]);
    }

    const childrenOf = (parentId: number | null): TreeNode[] =>
        (byParent.get(parentId) ?? [])
            .toSorted(
                (left, right) =>
                    left.position - right.position || left.id - right.id,
            )
            .map((node) => ({ ...node, children: childrenOf(node.id) }));

    return childrenOf(null);
}

const contextLabels: Record<string, string> = {
    stacks: 'Stacks and tools',
    codebases: 'Codebases',
    expected_work: 'Expected work',
    development_goals: 'Development goals',
};

const levelLabels: Record<string, string> = {
    not_yet_observed: 'Not yet observed',
    developing: 'Developing',
    consistent: 'Consistent',
    independent: 'Independent',
};

const statusLabels: Record<string, string> = {
    interviewing: 'Interviewing',
    awaiting_review: 'Awaiting review',
    approved: 'Approved',
    rejected: 'Rejected',
};

function NodeFields({
    prefix,
    nodes,
    defaults,
    errors,
}: {
    prefix: string;
    nodes: ProposalNode[];
    defaults?: ProposalNode;
    errors: Record<string, string>;
}) {
    return (
        <div className="grid gap-4">
            <FormField id={`${prefix}-name`} label="Name" error={errors.name}>
                <Input
                    id={`${prefix}-name`}
                    name="name"
                    defaultValue={defaults?.name}
                    required
                />
            </FormField>
            <FormField
                id={`${prefix}-definition`}
                label="Concise definition"
                error={errors.definition}
            >
                <Textarea
                    id={`${prefix}-definition`}
                    name="definition"
                    defaultValue={defaults?.definition}
                    required
                />
            </FormField>
            <FormField
                id={`${prefix}-criteria`}
                label="Observable demonstration criteria"
                error={errors.demonstration_criteria}
            >
                <Textarea
                    id={`${prefix}-criteria`}
                    name="demonstration_criteria"
                    defaultValue={defaults?.demonstrationCriteria}
                    required
                />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                    id={`${prefix}-parent`}
                    label="Parent"
                    error={errors.parent_id}
                >
                    <Select
                        name="parent_id"
                        defaultValue={String(defaults?.parentId ?? 'root')}
                    >
                        <SelectTrigger
                            id={`${prefix}-parent`}
                            className="w-full"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="root">Proposal root</SelectItem>
                            {nodes
                                .filter((node) => node.id !== defaults?.id)
                                .map((node) => (
                                    <SelectItem
                                        key={node.id}
                                        value={String(node.id)}
                                    >
                                        {node.name}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField
                    id={`${prefix}-position`}
                    label="Sibling position"
                    error={errors.position}
                >
                    <Input
                        id={`${prefix}-position`}
                        name="position"
                        type="number"
                        min={0}
                        defaultValue={defaults?.position ?? 0}
                    />
                </FormField>
            </div>
            <FormField
                id={`${prefix}-prerequisites`}
                label="Prerequisites"
                description="Comma-separated"
            >
                <Input
                    id={`${prefix}-prerequisites`}
                    name="prerequisites"
                    defaultValue={defaults?.prerequisites.join(', ')}
                />
            </FormField>
            <FormField
                id={`${prefix}-work`}
                label="Work opportunities"
                description="Comma-separated"
            >
                <Input
                    id={`${prefix}-work`}
                    name="work_opportunities"
                    defaultValue={defaults?.workOpportunities.join(', ')}
                />
            </FormField>
            <FormField
                id={`${prefix}-technologies`}
                label="Technologies"
                description="Comma-separated"
            >
                <Input
                    id={`${prefix}-technologies`}
                    name="technologies"
                    defaultValue={defaults?.technologies.join(', ')}
                />
            </FormField>
        </div>
    );
}

function ProposalNodeCard({
    node,
    nodes,
    learner,
    proposal,
    editable,
}: {
    node: TreeNode;
    nodes: ProposalNode[];
    learner: Learner;
    proposal: Proposal;
    editable: boolean;
}) {
    const routeParameters = {
        learner: learner.id,
        catalogProposal: proposal.id,
        node: node.id,
    };

    return (
        <li className="grid gap-3">
            <article
                className={`grid gap-3 rounded-lg border p-4 ${
                    node.selected
                        ? 'bg-background'
                        : 'border-dashed bg-muted/30 text-muted-foreground'
                }`}
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium">{node.name}</h3>
                            <StatusBadge
                                tone={node.selected ? 'success' : 'neutral'}
                            >
                                {node.selected ? 'Selected' : 'Excluded'}
                            </StatusBadge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {node.definition}
                        </p>
                    </div>
                    {editable && (
                        <div className="flex shrink-0 flex-wrap gap-2">
                            <Form {...updateSelection.form(routeParameters)}>
                                <input
                                    type="hidden"
                                    name="selected"
                                    value={node.selected ? '0' : '1'}
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    variant="outline"
                                    aria-pressed={node.selected}
                                    aria-label={`${node.selected ? 'Exclude' : 'Include'} ${node.name} branch`}
                                >
                                    {node.selected ? (
                                        <X aria-hidden="true" />
                                    ) : (
                                        <Check aria-hidden="true" />
                                    )}
                                    {node.selected ? 'Exclude' : 'Include'}
                                </Button>
                            </Form>

                            <Dialog>
                                <DialogTrigger
                                    render={
                                        <Button size="sm" variant="outline" />
                                    }
                                >
                                    <Pencil aria-hidden="true" />
                                    Edit
                                </DialogTrigger>
                                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                                    <DialogTitle>Edit {node.name}</DialogTitle>
                                    <DialogDescription>
                                        Refine this candidate before it enters
                                        the Learner's catalog.
                                    </DialogDescription>
                                    <Form
                                        {...updateNode.form(routeParameters)}
                                        className="grid gap-5"
                                    >
                                        {({ errors, processing }) => (
                                            <>
                                                <NodeFields
                                                    prefix={`edit-node-${node.id}`}
                                                    nodes={nodes}
                                                    defaults={node}
                                                    errors={errors}
                                                />
                                                <DialogFooter>
                                                    <DialogClose
                                                        render={
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                            />
                                                        }
                                                    >
                                                        Cancel
                                                    </DialogClose>
                                                    <SubmitButton
                                                        processing={processing}
                                                    >
                                                        Save changes
                                                    </SubmitButton>
                                                </DialogFooter>
                                            </>
                                        )}
                                    </Form>
                                </DialogContent>
                            </Dialog>

                            <Dialog>
                                <DialogTrigger
                                    render={
                                        <Button size="sm" variant="ghost" />
                                    }
                                >
                                    <Trash2 aria-hidden="true" />
                                    Remove
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogTitle>
                                        Remove {node.name}?
                                    </DialogTitle>
                                    <DialogDescription>
                                        This removes the proposed branch and its
                                        proposed baseline Assessments. The
                                        approved catalog is unchanged.
                                    </DialogDescription>
                                    <Form
                                        {...destroyNode.form(routeParameters)}
                                    >
                                        {({ processing }) => (
                                            <DialogFooter>
                                                <DialogClose
                                                    render={
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                        />
                                                    }
                                                >
                                                    Cancel
                                                </DialogClose>
                                                <SubmitButton
                                                    processing={processing}
                                                    variant="destructive"
                                                >
                                                    Remove branch
                                                </SubmitButton>
                                            </DialogFooter>
                                        )}
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </div>

                <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <span className="font-medium">Demonstration:</span>{' '}
                    {node.demonstrationCriteria}
                </div>

                {(node.technologies.length > 0 ||
                    node.workOpportunities.length > 0) && (
                    <dl className="grid gap-2 text-xs sm:grid-cols-2">
                        {node.technologies.length > 0 && (
                            <div>
                                <dt className="font-medium">Technologies</dt>
                                <dd className="text-muted-foreground">
                                    {node.technologies.join(', ')}
                                </dd>
                            </div>
                        )}
                        {node.workOpportunities.length > 0 && (
                            <div>
                                <dt className="font-medium">
                                    Work opportunities
                                </dt>
                                <dd className="text-muted-foreground">
                                    {node.workOpportunities.join(', ')}
                                </dd>
                            </div>
                        )}
                    </dl>
                )}
            </article>

            {node.children.length > 0 && (
                <ul
                    className="ml-4 grid gap-3 border-l pl-4"
                    aria-label={`Children of ${node.name}`}
                >
                    {node.children.map((child) => (
                        <ProposalNodeCard
                            key={child.id}
                            node={child}
                            nodes={nodes}
                            learner={learner}
                            proposal={proposal}
                            editable={editable}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

export default function CatalogProposalShow({
    learner,
    proposal,
}: {
    learner: Learner;
    proposal: Proposal;
}) {
    const editable = proposal.status === 'awaiting_review';
    const proposalParameters = {
        learner: learner.id,
        catalogProposal: proposal.id,
    };
    const selectedCount = proposal.nodes.filter((node) => node.selected).length;

    return (
        <>
            <Head title={`Catalog Proposal for ${learner.name}`} />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    eyebrow="Mentor review"
                    title={`Catalog Proposal for ${learner.name}`}
                    description={`Submitted through ${proposal.clientName} on ${proposal.submittedAt ?? 'an unknown date'}. Nothing enters the catalog until you approve it.`}
                    actions={
                        <>
                            <StatusBadge
                                tone={
                                    editable
                                        ? 'warning'
                                        : proposal.status === 'approved'
                                          ? 'success'
                                          : 'neutral'
                                }
                            >
                                {statusLabels[proposal.status] ??
                                    proposal.status}
                            </StatusBadge>
                            <Link
                                href={showCatalog(learner.id)}
                                className={buttonVariants({
                                    variant: 'outline',
                                })}
                            >
                                <BookOpen aria-hidden="true" />
                                Open catalog
                            </Link>
                        </>
                    }
                />

                <SectionCard
                    title="Interview context"
                    description="The Mentor's stack-neutral onboarding answers used to shape this proposal."
                    icon={Code2}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        {Object.entries(contextLabels).map(([key, label]) => (
                            <section
                                key={key}
                                className="rounded-lg border bg-background p-4"
                            >
                                <h3 className="text-sm font-medium">{label}</h3>
                                <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm text-muted-foreground">
                                    {(proposal.interviewContext[key] ?? []).map(
                                        (item) => (
                                            <li key={item}>{item}</li>
                                        ),
                                    )}
                                </ul>
                            </section>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard
                    title="Proposed Competency tree"
                    description={`${selectedCount} of ${proposal.nodes.length} proposed nodes selected. Selecting or excluding a node updates its whole branch.`}
                    icon={GitBranch}
                    action={
                        editable ? (
                            <Dialog>
                                <DialogTrigger render={<Button size="sm" />}>
                                    <Plus aria-hidden="true" />
                                    Add node
                                </DialogTrigger>
                                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                                    <DialogTitle>
                                        Add proposed Competency
                                    </DialogTitle>
                                    <DialogDescription>
                                        Add a candidate node without changing
                                        the approved catalog.
                                    </DialogDescription>
                                    <Form
                                        {...storeNode.form(proposalParameters)}
                                        className="grid gap-5"
                                    >
                                        {({ errors, processing }) => (
                                            <>
                                                <NodeFields
                                                    prefix="new-node"
                                                    nodes={proposal.nodes}
                                                    errors={errors}
                                                />
                                                <DialogFooter>
                                                    <DialogClose
                                                        render={
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                            />
                                                        }
                                                    >
                                                        Cancel
                                                    </DialogClose>
                                                    <SubmitButton
                                                        processing={processing}
                                                    >
                                                        Add node
                                                    </SubmitButton>
                                                </DialogFooter>
                                            </>
                                        )}
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        ) : undefined
                    }
                >
                    <ul
                        className="grid gap-3"
                        aria-label="Proposed Competencies"
                    >
                        {buildTree(proposal.nodes).map((node) => (
                            <ProposalNodeCard
                                key={node.id}
                                node={node}
                                nodes={proposal.nodes}
                                learner={learner}
                                proposal={proposal}
                                editable={editable}
                            />
                        ))}
                    </ul>
                </SectionCard>

                <SectionCard
                    title="Baseline Assessments"
                    description="Review these independently from the Catalog Proposal. Unsupported proficiency should remain not yet observed."
                    icon={Target}
                >
                    {proposal.baselineAssessments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No baseline Assessments were proposed.
                        </p>
                    ) : (
                        <ul
                            className="grid gap-3"
                            aria-label="Baseline Assessments"
                        >
                            {proposal.baselineAssessments.map((assessment) => (
                                <li
                                    key={assessment.id}
                                    className="rounded-lg border bg-background p-4"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-medium">
                                                    {assessment.nodeName}
                                                </h3>
                                                <StatusBadge tone="info">
                                                    {levelLabels[
                                                        assessment.level
                                                    ] ?? assessment.level}
                                                </StatusBadge>
                                                {assessment.decision !==
                                                    'pending' && (
                                                    <StatusBadge
                                                        tone={
                                                            assessment.decision ===
                                                            'approved'
                                                                ? 'success'
                                                                : 'destructive'
                                                        }
                                                    >
                                                        {assessment.decision ===
                                                        'approved'
                                                            ? 'Approved'
                                                            : 'Rejected'}
                                                    </StatusBadge>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {assessment.rationale ??
                                                    'No direct supporting evidence was supplied.'}
                                            </p>
                                            {assessment.decision ===
                                                'approved' &&
                                                !assessment.applied && (
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        This will apply only if
                                                        its Competency branch is
                                                        approved.
                                                    </p>
                                                )}
                                        </div>
                                        {assessment.decision === 'pending' && (
                                            <div className="flex shrink-0 gap-2">
                                                <Form
                                                    {...decideAssessment.form({
                                                        ...proposalParameters,
                                                        baselineAssessment:
                                                            assessment.id,
                                                    })}
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="decision"
                                                        value="approved"
                                                    />
                                                    <Button
                                                        type="submit"
                                                        size="sm"
                                                    >
                                                        <Check aria-hidden="true" />
                                                        Approve
                                                    </Button>
                                                </Form>
                                                <Form
                                                    {...decideAssessment.form({
                                                        ...proposalParameters,
                                                        baselineAssessment:
                                                            assessment.id,
                                                    })}
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="decision"
                                                        value="rejected"
                                                    />
                                                    <Button
                                                        type="submit"
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <X aria-hidden="true" />
                                                        Reject
                                                    </Button>
                                                </Form>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                {editable && (
                    <SectionCard
                        title="Catalog decision"
                        description="Approval copies only selected branches. Baseline Assessment decisions remain separate."
                        icon={ClipboardCheck}
                    >
                        <div className="flex flex-wrap gap-3">
                            <Form {...decideProposal.form(proposalParameters)}>
                                <input
                                    type="hidden"
                                    name="decision"
                                    value="approve"
                                />
                                <SubmitButton disabled={selectedCount === 0}>
                                    <Check aria-hidden="true" />
                                    Approve selected branches
                                </SubmitButton>
                            </Form>
                            <Form {...decideProposal.form(proposalParameters)}>
                                <input
                                    type="hidden"
                                    name="decision"
                                    value="reject"
                                />
                                <SubmitButton variant="outline">
                                    <X aria-hidden="true" />
                                    Reject proposal
                                </SubmitButton>
                            </Form>
                        </div>
                    </SectionCard>
                )}
            </div>
        </>
    );
}

CatalogProposalShow.layout = {
    breadcrumbs: [
        { title: 'Mentor dashboard', href: dashboard() },
        { title: 'Catalog Proposal', href: '#' },
    ],
};
