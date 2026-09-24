import { Form, Head } from '@inertiajs/react';
import {
    Archive,
    BookOpen,
    Boxes,
    GitMerge,
    Network,
    Pencil,
    Plus,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
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
import { archive, merge, store, update } from '@/routes/competencies';
import { store as copyTemplate } from '@/routes/competency-template-copies';

type Learner = {
    id: number;
    name: string;
    email: string;
};

type CatalogNode = {
    id: number;
    parentId: number | null;
    position: number;
    name: string;
    definition: string;
    demonstrationCriteria: string;
    prerequisites: string[];
    workOpportunities: string[];
    technologies: string[];
    archivedAt: string | null;
    mergedInto: { id: number; name: string } | null;
};

type TemplateNode = Omit<CatalogNode, 'archivedAt' | 'mergedInto'>;

type CompetencyTemplate = {
    id: number;
    name: string;
    description: string;
    nodes: TemplateNode[];
};

type Props = {
    learner: Learner;
    canManage: boolean;
    competencies: CatalogNode[];
    templates: CompetencyTemplate[];
};

type TreeNode<T> = T & { children: TreeNode<T>[] };

function buildTree<
    T extends { id: number; parentId: number | null; position: number },
>(nodes: T[]): TreeNode<T>[] {
    const childrenByParent = new Map<number | null, T[]>();

    for (const node of nodes) {
        const siblings = childrenByParent.get(node.parentId) ?? [];
        siblings.push(node);
        childrenByParent.set(node.parentId, siblings);
    }

    const attachChildren = (parentId: number | null): TreeNode<T>[] =>
        (childrenByParent.get(parentId) ?? [])
            .toSorted(
                (left, right) =>
                    left.position - right.position || left.id - right.id,
            )
            .map((node) => ({
                ...node,
                children: attachChildren(node.id),
            }));

    return attachChildren(null);
}

function Metadata({ label, values }: { label: string; values: string[] }) {
    if (values.length === 0) {
        return null;
    }

    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground">
                {label}
            </dt>
            <dd className="flex flex-wrap gap-1.5">
                {values.map((value) => (
                    <span
                        key={value}
                        className="rounded-md bg-muted px-2 py-1 text-xs"
                    >
                        {value}
                    </span>
                ))}
            </dd>
        </div>
    );
}

function ParentSelect({
    id,
    name = 'parent_id',
    nodes,
    defaultValue,
    error,
    excludedId,
}: {
    id: string;
    name?: string;
    nodes: CatalogNode[];
    defaultValue: number | null;
    error?: string;
    excludedId?: number;
}) {
    return (
        <Select name={name} defaultValue={String(defaultValue ?? 'root')}>
            <SelectTrigger
                id={id}
                className="w-full"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
                <SelectItem value="root">Catalog root</SelectItem>
                {nodes
                    .filter(
                        (node) =>
                            node.id !== excludedId &&
                            node.archivedAt === null &&
                            node.mergedInto === null,
                    )
                    .map((node) => (
                        <SelectItem key={node.id} value={String(node.id)}>
                            {node.name}
                        </SelectItem>
                    ))}
            </SelectContent>
        </Select>
    );
}

function CompetencyFields({
    idPrefix,
    errors,
    nodes,
    defaults,
    fixedParent,
}: {
    idPrefix: string;
    errors: Record<string, string>;
    nodes: CatalogNode[];
    defaults?: CatalogNode;
    fixedParent?: CatalogNode;
}) {
    return (
        <div className="grid gap-4">
            <FormField id={`${idPrefix}-name`} label="Name" error={errors.name}>
                <Input
                    id={`${idPrefix}-name`}
                    name="name"
                    defaultValue={defaults?.name}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                        errors.name ? `${idPrefix}-name-error` : undefined
                    }
                    required
                />
            </FormField>
            <FormField
                id={`${idPrefix}-definition`}
                label="Concise definition"
                error={errors.definition}
            >
                <Textarea
                    id={`${idPrefix}-definition`}
                    name="definition"
                    defaultValue={defaults?.definition}
                    aria-invalid={Boolean(errors.definition)}
                    aria-describedby={
                        errors.definition
                            ? `${idPrefix}-definition-error`
                            : undefined
                    }
                    required
                />
            </FormField>
            <FormField
                id={`${idPrefix}-criteria`}
                label="Observable demonstration criteria"
                error={errors.demonstration_criteria}
                description="Describe behavior a Mentor or Codex could actually observe."
            >
                <Textarea
                    id={`${idPrefix}-criteria`}
                    name="demonstration_criteria"
                    defaultValue={defaults?.demonstrationCriteria}
                    aria-invalid={Boolean(errors.demonstration_criteria)}
                    aria-describedby={
                        errors.demonstration_criteria
                            ? `${idPrefix}-criteria-error`
                            : `${idPrefix}-criteria-description`
                    }
                    required
                />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                    id={`${idPrefix}-parent`}
                    label="Parent"
                    error={errors.parent_id}
                >
                    {fixedParent ? (
                        <>
                            <input
                                type="hidden"
                                name="parent_id"
                                value={fixedParent.id}
                            />
                            <div
                                id={`${idPrefix}-parent`}
                                className="flex h-9 items-center rounded-md border bg-muted/40 px-2.5 text-sm"
                            >
                                {fixedParent.name}
                            </div>
                        </>
                    ) : (
                        <ParentSelect
                            id={`${idPrefix}-parent`}
                            nodes={nodes}
                            defaultValue={defaults?.parentId ?? null}
                            error={errors.parent_id}
                            excludedId={defaults?.id}
                        />
                    )}
                </FormField>
                <FormField
                    id={`${idPrefix}-position`}
                    label="Position"
                    error={errors.position}
                    description="Zero is first among siblings."
                >
                    <Input
                        id={`${idPrefix}-position`}
                        name="position"
                        type="number"
                        min={0}
                        defaultValue={defaults?.position ?? 0}
                        aria-invalid={Boolean(errors.position)}
                        aria-describedby={
                            errors.position
                                ? `${idPrefix}-position-error`
                                : `${idPrefix}-position-description`
                        }
                        required
                    />
                </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                    id={`${idPrefix}-prerequisites`}
                    label="Prerequisites"
                    optional
                    error={errors.prerequisites}
                    description="Comma-separated"
                >
                    <Input
                        id={`${idPrefix}-prerequisites`}
                        name="prerequisites"
                        defaultValue={defaults?.prerequisites.join(', ')}
                        aria-invalid={Boolean(errors.prerequisites)}
                    />
                </FormField>
                <FormField
                    id={`${idPrefix}-technologies`}
                    label="Applicable technologies"
                    optional
                    error={errors.technologies}
                    description="Comma-separated"
                >
                    <Input
                        id={`${idPrefix}-technologies`}
                        name="technologies"
                        defaultValue={defaults?.technologies.join(', ')}
                        aria-invalid={Boolean(errors.technologies)}
                    />
                </FormField>
            </div>
            <FormField
                id={`${idPrefix}-opportunities`}
                label="Example work opportunities"
                optional
                error={errors.work_opportunities}
                description="Comma-separated"
            >
                <Input
                    id={`${idPrefix}-opportunities`}
                    name="work_opportunities"
                    defaultValue={defaults?.workOpportunities.join(', ')}
                    aria-invalid={Boolean(errors.work_opportunities)}
                />
            </FormField>
        </div>
    );
}

function AddCompetencyDialog({
    learner,
    nodes,
    parent,
    trigger,
}: {
    learner: Learner;
    nodes: CatalogNode[];
    parent?: CatalogNode;
    trigger?: ReactNode;
}) {
    const idPrefix = parent ? `add-child-${parent.id}` : 'add-competency';

    return (
        <Dialog>
            <DialogTrigger render={<Button size="sm" />}>
                {trigger ?? (
                    <>
                        <Plus aria-hidden="true" />
                        Add Competency
                    </>
                )}
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>
                    {parent
                        ? `Add child Competency to ${parent.name}`
                        : 'Add Competency'}
                </DialogTitle>
                <DialogDescription>
                    Define what this Competency means and how understanding can
                    be observed.
                </DialogDescription>
                <Form
                    {...store.form(learner.id)}
                    errorBag={idPrefix}
                    resetOnSuccess
                    disableWhileProcessing
                    className="grid gap-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <CompetencyFields
                                idPrefix={idPrefix}
                                errors={errors}
                                nodes={nodes}
                                fixedParent={parent}
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
                                    processingLabel="Adding…"
                                >
                                    Add Competency
                                </SubmitButton>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function EditCompetencyDialog({
    learner,
    node,
    nodes,
}: {
    learner: Learner;
    node: CatalogNode;
    nodes: CatalogNode[];
}) {
    return (
        <Dialog>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <Pencil aria-hidden="true" />
                Edit
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>Edit {node.name}</DialogTitle>
                <DialogDescription>
                    Rename, move, reorder, or refine this Competency without
                    changing its identity.
                </DialogDescription>
                <Form
                    {...update.form({
                        learner: learner.id,
                        competency: node.id,
                    })}
                    errorBag={`edit-competency-${node.id}`}
                    disableWhileProcessing
                    className="grid gap-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <CompetencyFields
                                idPrefix={`edit-competency-${node.id}`}
                                errors={errors}
                                nodes={nodes}
                                defaults={node}
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
                                    processingLabel="Saving…"
                                >
                                    Save changes
                                </SubmitButton>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function ArchiveCompetencyDialog({
    learner,
    node,
}: {
    learner: Learner;
    node: CatalogNode;
}) {
    return (
        <Dialog>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <Archive aria-hidden="true" />
                Archive
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Archive {node.name}?</DialogTitle>
                <DialogDescription>
                    The Competency will stop being used for new coaching. Its
                    identity, children, and historical references remain
                    available.
                </DialogDescription>
                <Form
                    {...archive.form({
                        learner: learner.id,
                        competency: node.id,
                    })}
                    disableWhileProcessing
                >
                    {({ processing }) => (
                        <DialogFooter>
                            <DialogClose
                                render={
                                    <Button type="button" variant="outline" />
                                }
                            >
                                Keep active
                            </DialogClose>
                            <SubmitButton
                                processing={processing}
                                processingLabel="Archiving…"
                            >
                                Archive Competency
                            </SubmitButton>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function MergeCompetencyDialog({
    learner,
    node,
    nodes,
}: {
    learner: Learner;
    node: CatalogNode;
    nodes: CatalogNode[];
}) {
    const targets = nodes.filter(
        (target) =>
            target.id !== node.id &&
            target.archivedAt === null &&
            target.mergedInto === null,
    );

    if (targets.length === 0) {
        return null;
    }

    return (
        <Dialog>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <GitMerge aria-hidden="true" />
                Merge
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Merge {node.name}</DialogTitle>
                <DialogDescription>
                    Choose the Competency that should replace this duplicate.
                    Existing references will continue to point to this source
                    through an auditable mapping.
                </DialogDescription>
                <Form
                    {...merge.form({
                        learner: learner.id,
                        competency: node.id,
                    })}
                    errorBag={`merge-competency-${node.id}`}
                    disableWhileProcessing
                    className="grid gap-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <FormField
                                id={`merge-competency-${node.id}-target`}
                                label="Merge into"
                                error={errors.target_competency_id}
                            >
                                <Select name="target_competency_id" required>
                                    <SelectTrigger
                                        id={`merge-competency-${node.id}-target`}
                                        className="w-full"
                                        aria-invalid={Boolean(
                                            errors.target_competency_id,
                                        )}
                                    >
                                        <SelectValue placeholder="Select a Competency" />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        {targets.map((target) => (
                                            <SelectItem
                                                key={target.id}
                                                value={String(target.id)}
                                            >
                                                {target.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
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
                                    processingLabel="Merging…"
                                >
                                    Merge Competencies
                                </SubmitButton>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function CatalogTreeNode({
    learner,
    node,
    allNodes,
    canManage,
}: {
    learner: Learner;
    node: TreeNode<CatalogNode>;
    allNodes: CatalogNode[];
    canManage: boolean;
}) {
    const isActive = node.archivedAt === null && node.mergedInto === null;

    return (
        <li className="grid gap-3">
            <article className="grid min-w-0 gap-4 rounded-lg border bg-background p-4 shadow-xs">
                <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="grid min-w-0 gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{node.name}</h3>
                            {node.archivedAt && (
                                <StatusBadge tone="warning">
                                    Archived
                                </StatusBadge>
                            )}
                            {node.mergedInto && (
                                <StatusBadge tone="info">
                                    Merged into {node.mergedInto.name}
                                </StatusBadge>
                            )}
                        </div>
                        <p className="text-sm leading-6">{node.definition}</p>
                        <div className="rounded-md bg-muted/40 p-3">
                            <p className="text-xs font-medium text-muted-foreground">
                                Observable demonstration
                            </p>
                            <p className="mt-1 text-sm leading-6">
                                {node.demonstrationCriteria}
                            </p>
                        </div>
                    </div>

                    {canManage && isActive && (
                        <div className="flex shrink-0 flex-wrap gap-2">
                            <AddCompetencyDialog
                                learner={learner}
                                nodes={allNodes}
                                parent={node}
                                trigger="Add child"
                            />
                            <EditCompetencyDialog
                                learner={learner}
                                node={node}
                                nodes={allNodes}
                            />
                            <MergeCompetencyDialog
                                learner={learner}
                                node={node}
                                nodes={allNodes}
                            />
                            <ArchiveCompetencyDialog
                                learner={learner}
                                node={node}
                            />
                        </div>
                    )}
                </div>

                <dl className="grid gap-3 sm:grid-cols-3">
                    <Metadata
                        label="Prerequisites"
                        values={node.prerequisites}
                    />
                    <Metadata
                        label="Work opportunities"
                        values={node.workOpportunities}
                    />
                    <Metadata label="Technologies" values={node.technologies} />
                </dl>
            </article>

            {node.children.length > 0 && (
                <ul
                    className="ml-3 grid gap-3 border-l pl-3 sm:ml-6 sm:pl-5"
                    aria-label={`Children of ${node.name}`}
                >
                    {node.children.map((child) => (
                        <CatalogTreeNode
                            key={child.id}
                            learner={learner}
                            node={child}
                            allNodes={allNodes}
                            canManage={canManage}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

function TemplateTree({ nodes }: { nodes: TemplateNode[] }) {
    const tree = buildTree(nodes);

    const renderNodes = (items: TreeNode<TemplateNode>[]) => (
        <ul className="grid gap-2">
            {items.map((node) => (
                <li key={node.id} className="grid gap-2">
                    <div className="rounded-md border bg-background px-3 py-2">
                        <p className="text-sm font-medium">{node.name}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {node.definition}
                        </p>
                    </div>
                    {node.children.length > 0 && (
                        <div className="ml-4 border-l pl-3">
                            {renderNodes(node.children)}
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );

    return renderNodes(tree);
}

function TemplateCard({
    learner,
    template,
    competencies,
    canManage,
}: {
    learner: Learner;
    template: CompetencyTemplate;
    competencies: CatalogNode[];
    canManage: boolean;
}) {
    return (
        <article className="grid gap-4 rounded-lg border bg-background p-4">
            <div>
                <h3 className="font-semibold">{template.name}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {template.description}
                </p>
            </div>
            <TemplateTree nodes={template.nodes} />
            {canManage && (
                <Form
                    {...copyTemplate.form(learner.id)}
                    errorBag={`copy-template-${template.id}`}
                    disableWhileProcessing
                    className="grid gap-3 border-t pt-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <input
                                type="hidden"
                                name="template_id"
                                value={template.id}
                            />
                            <FormField
                                id={`template-${template.id}-parent`}
                                label="Copy beneath"
                                error={errors.parent_id}
                            >
                                <ParentSelect
                                    id={`template-${template.id}-parent`}
                                    nodes={competencies}
                                    defaultValue={null}
                                    error={errors.parent_id}
                                />
                            </FormField>
                            <SubmitButton
                                processing={processing}
                                processingLabel="Copying…"
                            >
                                Copy template to {learner.name}
                            </SubmitButton>
                        </>
                    )}
                </Form>
            )}
        </article>
    );
}

export default function CompetencyCatalog({
    learner,
    canManage,
    competencies,
    templates,
}: Props) {
    const tree = buildTree(competencies);

    return (
        <>
            <Head title={`${learner.name}'s Competency Catalog`} />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    title={`${learner.name}'s Competency Catalog`}
                    description="Maintain a learner-specific tree with observable criteria and stable historical identities."
                    eyebrow="Mentor workspace"
                    actions={
                        canManage ? (
                            <AddCompetencyDialog
                                learner={learner}
                                nodes={competencies}
                            />
                        ) : undefined
                    }
                />

                <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <SectionCard
                        title="Catalog tree"
                        description={`${competencies.length} ${competencies.length === 1 ? 'Competency' : 'Competencies'} for ${learner.email}`}
                        icon={Network}
                    >
                        {tree.length === 0 ? (
                            <EmptyState
                                icon={Boxes}
                                title="No Competencies yet"
                                description="Add a focused Competency or copy a reusable template to begin this Learner's catalog."
                            />
                        ) : (
                            <ul
                                className="grid gap-3"
                                aria-label="Competency tree"
                            >
                                {tree.map((node) => (
                                    <CatalogTreeNode
                                        key={node.id}
                                        learner={learner}
                                        node={node}
                                        allNodes={competencies}
                                        canManage={canManage}
                                    />
                                ))}
                            </ul>
                        )}
                    </SectionCard>

                    <SectionCard
                        title="Reusable templates"
                        description="Browse a candidate tree, then copy it into only this Learner's catalog."
                        icon={BookOpen}
                        className="h-fit"
                    >
                        {templates.length === 0 ? (
                            <EmptyState
                                title="No templates available"
                                description="Run the application seeders to install the reusable foundation catalogs."
                                className="min-h-36"
                            />
                        ) : (
                            <div className="grid gap-4">
                                {templates.map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        learner={learner}
                                        template={template}
                                        competencies={competencies}
                                        canManage={canManage}
                                    />
                                ))}
                            </div>
                        )}
                    </SectionCard>
                </div>
            </div>
        </>
    );
}

CompetencyCatalog.layout = {
    breadcrumbs: [
        { title: 'Mentor dashboard', href: dashboard() },
        {
            title: 'Competency Catalog',
            href: dashboard(),
        },
    ],
};
