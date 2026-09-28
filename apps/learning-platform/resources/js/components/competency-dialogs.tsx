import { Form } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { FormField } from '@/components/form-field';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
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
import { archive, merge, store, update } from '@/routes/competencies';
import type { PlanCompetency, PlanLearner } from '@/types/coaching-plan';

type DialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

function isActive(node: PlanCompetency): boolean {
    return node.archivedAt === null && node.mergedInto === null;
}

function ParentSelect({
    id,
    nodes,
    defaultValue,
    error,
    excludedId,
}: {
    id: string;
    nodes: PlanCompetency[];
    defaultValue: number | null;
    error?: string;
    excludedId?: number;
}) {
    return (
        <Select name="parent_id" defaultValue={String(defaultValue ?? 'root')}>
            <SelectTrigger
                id={id}
                className="w-full"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
                <SelectItem value="root">Top level</SelectItem>
                {nodes
                    .filter((node) => node.id !== excludedId && isActive(node))
                    .map((node) => (
                        <SelectItem key={node.id} value={String(node.id)}>
                            {node.name}
                        </SelectItem>
                    ))}
            </SelectContent>
        </Select>
    );
}

/**
 * The three fields every Competency needs stay visible; everything optional
 * sits behind "More details" so adding one is a short form.
 */
function CompetencyFields({
    idPrefix,
    errors,
    nodes,
    defaults,
    parent,
}: {
    idPrefix: string;
    errors: Record<string, string>;
    nodes: PlanCompetency[];
    defaults?: PlanCompetency;
    parent?: PlanCompetency;
}) {
    const hasOptionalErrors = Boolean(
        errors.parent_id ||
        errors.prerequisites ||
        errors.technologies ||
        errors.work_opportunities,
    );

    return (
        <div className="grid gap-4">
            {parent && (
                <input type="hidden" name="parent_id" value={parent.id} />
            )}
            <FormField id={`${idPrefix}-name`} label="Name" error={errors.name}>
                <Input
                    id={`${idPrefix}-name`}
                    name="name"
                    defaultValue={defaults?.name}
                    placeholder="Feature testing"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                        errors.name ? `${idPrefix}-name-error` : undefined
                    }
                    required
                />
            </FormField>
            <FormField
                id={`${idPrefix}-definition`}
                label="What it means"
                error={errors.definition}
                description="One or two sentences."
            >
                <Textarea
                    id={`${idPrefix}-definition`}
                    name="definition"
                    defaultValue={defaults?.definition}
                    aria-invalid={Boolean(errors.definition)}
                    aria-describedby={
                        errors.definition
                            ? `${idPrefix}-definition-error`
                            : `${idPrefix}-definition-description`
                    }
                    required
                />
            </FormField>
            <FormField
                id={`${idPrefix}-criteria`}
                label="How you'll know it's demonstrated"
                error={errors.demonstration_criteria}
                description="Behaviour you or Codex could actually observe in their work."
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
                    rows={5}
                    required
                />
            </FormField>
            <Collapsible defaultOpen={hasOptionalErrors}>
                <CollapsibleTrigger
                    render={
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="group -ml-2 w-fit"
                        />
                    }
                >
                    <ChevronDown
                        aria-hidden="true"
                        className="transition-transform group-data-[panel-open]:rotate-180"
                    />
                    More details
                </CollapsibleTrigger>
                {/* Kept mounted so collapsed fields still submit their current values. */}
                <CollapsibleContent keepMounted className="grid gap-4 pt-3">
                    {defaults && (
                        <FormField
                            id={`${idPrefix}-parent`}
                            label="Belongs under"
                            error={errors.parent_id}
                        >
                            <ParentSelect
                                id={`${idPrefix}-parent`}
                                nodes={nodes}
                                defaultValue={defaults.parentId}
                                error={errors.parent_id}
                                excludedId={defaults.id}
                            />
                        </FormField>
                    )}
                    <FormField
                        id={`${idPrefix}-technologies`}
                        label="Technologies"
                        optional
                        error={errors.technologies}
                        description="Comma-separated. Helps coaching recognise relevant work."
                    >
                        <Input
                            id={`${idPrefix}-technologies`}
                            name="technologies"
                            defaultValue={defaults?.technologies.join(', ')}
                            aria-invalid={Boolean(errors.technologies)}
                        />
                    </FormField>
                    <FormField
                        id={`${idPrefix}-opportunities`}
                        label="Example work"
                        optional
                        error={errors.work_opportunities}
                        description="Comma-separated"
                    >
                        <Input
                            id={`${idPrefix}-opportunities`}
                            name="work_opportunities"
                            defaultValue={defaults?.workOpportunities.join(
                                ', ',
                            )}
                            aria-invalid={Boolean(errors.work_opportunities)}
                        />
                    </FormField>
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
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

function DialogActions({
    processing,
    processingLabel,
    label,
}: {
    processing: boolean;
    processingLabel: string;
    label: string;
}) {
    return (
        <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
            </DialogClose>
            <SubmitButton
                processing={processing}
                processingLabel={processingLabel}
            >
                {label}
            </SubmitButton>
        </DialogFooter>
    );
}

export function AddCompetencyDialog({
    learner,
    nodes,
    parent,
    open,
    onOpenChange,
}: DialogProps & {
    learner: PlanLearner;
    nodes: PlanCompetency[];
    parent?: PlanCompetency;
}) {
    const idPrefix = parent ? `add-child-${parent.id}` : 'add-competency';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>
                    {parent
                        ? `Add a competency under ${parent.name}`
                        : 'Add a competency'}
                </DialogTitle>
                <DialogDescription>
                    Describe the skill and what good looks like.
                </DialogDescription>
                <Form
                    {...store.form(learner.id)}
                    errorBag={idPrefix}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
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
                                parent={parent}
                            />
                            <DialogActions
                                processing={processing}
                                processingLabel="Adding…"
                                label="Add competency"
                            />
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function EditCompetencyDialog({
    learner,
    node,
    nodes,
    open,
    onOpenChange,
}: DialogProps & {
    learner: PlanLearner;
    node: PlanCompetency;
    nodes: PlanCompetency[];
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>Edit {node.name}</DialogTitle>
                <DialogDescription>
                    Changes keep this competency's history intact.
                </DialogDescription>
                <Form
                    {...update.form({
                        learner: learner.id,
                        competency: node.id,
                    })}
                    errorBag={`edit-competency-${node.id}`}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
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
                            <DialogActions
                                processing={processing}
                                processingLabel="Saving…"
                                label="Save changes"
                            />
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function ArchiveCompetencyDialog({
    learner,
    node,
    open,
    onOpenChange,
}: DialogProps & {
    learner: PlanLearner;
    node: PlanCompetency;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Archive {node.name}?</DialogTitle>
                <DialogDescription>
                    Coaching stops using it. Its history and any
                    sub-competencies stay available.
                </DialogDescription>
                <Form
                    {...archive.form({
                        learner: learner.id,
                        competency: node.id,
                    })}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                    disableWhileProcessing
                >
                    {({ processing }) => (
                        <DialogActions
                            processing={processing}
                            processingLabel="Archiving…"
                            label="Archive"
                        />
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function MergeCompetencyDialog({
    learner,
    node,
    nodes,
    open,
    onOpenChange,
}: DialogProps & {
    learner: PlanLearner;
    node: PlanCompetency;
    nodes: PlanCompetency[];
}) {
    const targets = nodes.filter(
        (target) => target.id !== node.id && isActive(target),
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>
                    Merge {node.name} into another competency
                </DialogTitle>
                <DialogDescription>
                    Use this for duplicates. Existing history keeps pointing to
                    the original.
                </DialogDescription>
                <Form
                    {...merge.form({
                        learner: learner.id,
                        competency: node.id,
                    })}
                    errorBag={`merge-competency-${node.id}`}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
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
                                        <SelectValue placeholder="Choose a competency" />
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
                            <DialogActions
                                processing={processing}
                                processingLabel="Merging…"
                                label="Merge"
                            />
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/** Opens a dialog from a plain button, for pages that don't need to control it. */
export function DialogButton({
    label,
    icon,
    variant = 'default',
    children,
}: {
    label: string;
    icon?: ReactElement;
    variant?: 'default' | 'outline';
    children: (props: DialogProps) => ReactElement;
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
                {icon}
                {label}
            </Button>
            {children({ open, onOpenChange: setOpen })}
        </>
    );
}
