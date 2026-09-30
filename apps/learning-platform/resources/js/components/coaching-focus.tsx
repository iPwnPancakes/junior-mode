import { Form, router } from '@inertiajs/react';
import { Check, Crosshair, Pencil, TimerReset } from 'lucide-react';
import { useState } from 'react';
import { FormField } from '@/components/form-field';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { store as storeAssessment } from '@/routes/assessments';
import {
    store as storePriority,
    update as updatePriority,
} from '@/routes/coaching-priorities';
import { store as renewPriority } from '@/routes/coaching-priority-renewals';
import { store as resolvePriority } from '@/routes/coaching-priority-resolutions';
import type {
    AssessmentLevel,
    CoachingFocus,
    ExpirationMode,
    PlanCompetency,
} from '@/types/coaching-plan';

export const selectClasses =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export const levels: { value: AssessmentLevel; label: string; hint: string }[] =
    [
        {
            value: 'not_yet_observed',
            label: 'Not yet observed',
            hint: "You haven't seen them do it yet.",
        },
        {
            value: 'developing',
            label: 'Developing',
            hint: 'Does it with guidance or help.',
        },
        {
            value: 'consistent',
            label: 'Consistent',
            hint: 'Does it reliably in familiar work.',
        },
        {
            value: 'independent',
            label: 'Independent',
            hint: 'Does it unprompted, including in new situations.',
        },
    ];

function OneClickForm({
    form,
    fields,
    label,
    icon,
    variant = 'outline',
}: {
    form: ReturnType<typeof storePriority.form>;
    fields: Record<string, string | number>;
    label: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'outline';
}) {
    return (
        <Form {...form} options={{ preserveScroll: true }}>
            {({ processing }) => (
                <>
                    {Object.entries(fields).map(([name, value]) => (
                        <input
                            key={name}
                            type="hidden"
                            name={name}
                            value={value}
                        />
                    ))}
                    <Button
                        type="submit"
                        size="sm"
                        variant={variant}
                        disabled={processing}
                    >
                        {icon}
                        {label}
                    </Button>
                </>
            )}
        </Form>
    );
}

/**
 * Focus actions for one competency. Starting, extending, and finishing a focus
 * are one click with the Mentor's defaults; everything else lives in "Edit".
 */
export function FocusActions({
    learnerId,
    competency,
    defaultDuration,
}: {
    learnerId: number;
    competency: PlanCompetency;
    defaultDuration: number;
}) {
    const [editing, setEditing] = useState(false);
    const focus = competency.focus;

    if (focus === null) {
        return (
            <OneClickForm
                form={storePriority.form(learnerId)}
                fields={{
                    competency_id: competency.id,
                    emphasis: 'normal',
                    expiration_mode: 'default_duration',
                }}
                label="Focus coaching here"
                icon={<Crosshair aria-hidden="true" />}
            />
        );
    }

    const route = { learner: learnerId, coachingPriority: focus.id };

    return (
        <>
            {focus.expiresOn !== null && (
                <OneClickForm
                    form={renewPriority.form(route)}
                    fields={{ expiration_mode: 'default_duration' }}
                    label={`Extend ${defaultDuration} days`}
                    icon={<TimerReset aria-hidden="true" />}
                />
            )}
            <OneClickForm
                form={resolvePriority.form(route)}
                fields={{ status: 'sufficiently_demonstrated' }}
                label="Done"
                icon={<Check aria-hidden="true" />}
            />
            <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
            >
                <Pencil aria-hidden="true" />
                Edit focus
            </Button>
            <EditFocusDialog
                learnerId={learnerId}
                focus={focus}
                defaultDuration={defaultDuration}
                open={editing}
                onOpenChange={setEditing}
            />
        </>
    );
}

function EditFocusDialog({
    learnerId,
    focus,
    defaultDuration,
    open,
    onOpenChange,
}: {
    learnerId: number;
    focus: CoachingFocus;
    defaultDuration: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [mode, setMode] = useState<ExpirationMode>(focus.expirationMode);
    const prefix = `focus-${focus.id}`;
    const route = { learner: learnerId, coachingPriority: focus.id };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Focus on {focus.competencyName}</DialogTitle>
                <DialogDescription>
                    Adjust how coaching treats this focus.
                </DialogDescription>
                <Form
                    {...updatePriority.form(route)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                    disableWhileProcessing
                    className="grid gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <FormField
                                id={`${prefix}-emphasis`}
                                label="Emphasis"
                                error={errors.emphasis}
                                description="High asks coaching to prefer this over other focuses."
                            >
                                <select
                                    id={`${prefix}-emphasis`}
                                    name="emphasis"
                                    className={selectClasses}
                                    defaultValue={focus.emphasis}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                </select>
                            </FormField>
                            <FormField
                                id={`${prefix}-expiration-mode`}
                                label="Ends"
                                error={errors.expiration_mode}
                            >
                                <select
                                    id={`${prefix}-expiration-mode`}
                                    name="expiration_mode"
                                    className={selectClasses}
                                    value={mode}
                                    onChange={(event) =>
                                        setMode(
                                            event.target
                                                .value as ExpirationMode,
                                        )
                                    }
                                >
                                    <option value="default_duration">
                                        {defaultDuration} days from today
                                    </option>
                                    <option value="custom_date">
                                        On a date
                                    </option>
                                    <option value="until_removed">
                                        When I mark it done
                                    </option>
                                </select>
                            </FormField>
                            {mode === 'custom_date' && (
                                <FormField
                                    id={`${prefix}-expires-on`}
                                    label="End date"
                                    error={errors.expires_on}
                                >
                                    <Input
                                        id={`${prefix}-expires-on`}
                                        name="expires_on"
                                        type="date"
                                        defaultValue={focus.expiresOn ?? ''}
                                        required
                                    />
                                </FormField>
                            )}
                            <FormField
                                id={`${prefix}-note`}
                                label="Note for coaching"
                                error={errors.note}
                                optional
                            >
                                <Textarea
                                    id={`${prefix}-note`}
                                    name="note"
                                    defaultValue={focus.note ?? ''}
                                    rows={3}
                                />
                            </FormField>
                            <DialogFooter className="sm:justify-between">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={processing}
                                    onClick={() =>
                                        router.post(
                                            resolvePriority.url(route),
                                            { status: 'closed' },
                                            {
                                                preserveScroll: true,
                                                onSuccess: () =>
                                                    onOpenChange(false),
                                            },
                                        )
                                    }
                                >
                                    Stop without marking done
                                </Button>
                                <div className="flex gap-2">
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
                                    <SubmitButton processing={processing}>
                                        Save
                                    </SubmitButton>
                                </div>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/** Records the Mentor's current judgment of a competency in one choice. */
export function SetLevelDialog({
    learnerId,
    competency,
    open,
    onOpenChange,
}: {
    learnerId: number;
    competency: PlanCompetency;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [level, setLevel] = useState<AssessmentLevel>(
        competency.level?.value ?? 'not_yet_observed',
    );
    const prefix = `level-${competency.id}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>How is {competency.name} going?</DialogTitle>
                <DialogDescription>
                    Your judgment today. It doesn't change what coaching focuses
                    on.
                </DialogDescription>
                <Form
                    {...storeAssessment.form(learnerId)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                    disableWhileProcessing
                    className="grid gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <input
                                type="hidden"
                                name="competency_id"
                                value={competency.id}
                            />
                            <input type="hidden" name="level" value={level} />
                            <ToggleGroup
                                aria-label="Level"
                                orientation="vertical"
                                value={[level]}
                                onValueChange={(value) => {
                                    if (value[0]) {
                                        setLevel(value[0] as AssessmentLevel);
                                    }
                                }}
                                className="grid w-full gap-2"
                            >
                                {levels.map((option) => (
                                    <ToggleGroupItem
                                        key={option.value}
                                        value={option.value}
                                        variant="outline"
                                        className="h-auto w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
                                    >
                                        <span className="font-medium">
                                            {option.label}
                                        </span>
                                        <span className="text-xs font-normal text-muted-foreground">
                                            {option.hint}
                                        </span>
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <FormField
                                id={`${prefix}-rationale`}
                                label="Why"
                                error={errors.rationale ?? errors.level}
                                optional
                            >
                                <Textarea
                                    id={`${prefix}-rationale`}
                                    name="rationale"
                                    rows={2}
                                    placeholder="What you saw that supports this"
                                />
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
                                <SubmitButton processing={processing}>
                                    Save level
                                </SubmitButton>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
