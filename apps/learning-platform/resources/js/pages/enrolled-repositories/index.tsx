import { Form, Head } from '@inertiajs/react';
import {
    FolderGit2,
    FolderPlus,
    Inbox,
    MapPin,
    Pencil,
    Power,
    PowerOff,
} from 'lucide-react';
import { useId } from 'react';
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
    index as repositories,
    store as enrollRepository,
    update as updateRepository,
} from '@/routes/enrolled-repositories';
import {
    destroy as unenrollRepository,
    store as reenrollRepository,
} from '@/routes/repository-enrollments';

type RepositoryStatus = 'enrolled' | 'unenrolled';

export type EnrolledRepository = {
    id: number;
    identity: string;
    displayName: string;
    normalizedRemote: string | null;
    localPath: string | null;
    status: RepositoryStatus;
    enrolledAt: string;
    unenrolledAt: string | null;
};

export type RepositoryLearner = {
    id: number;
    name: string;
    email: string;
    repositories: EnrolledRepository[];
};

type Props = {
    viewerRole: 'mentor' | 'learner';
    learner: RepositoryLearner | null;
    learners: RepositoryLearner[];
};

function RepositoryEditor({
    learnerId,
    repository,
}: {
    learnerId: number;
    repository?: EnrolledRepository;
}) {
    const inputId = useId();
    const isEditing = repository !== undefined;

    return (
        <Dialog>
            <DialogTrigger
                render={
                    <Button
                        variant={isEditing ? 'outline' : 'default'}
                        size="sm"
                    />
                }
            >
                {isEditing ? (
                    <Pencil aria-hidden="true" />
                ) : (
                    <FolderPlus aria-hidden="true" />
                )}
                {isEditing ? 'Edit' : 'Enroll repository'}
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    {isEditing
                        ? 'Edit repository details'
                        : 'Enroll a repository'}
                </DialogTitle>
                <DialogDescription>
                    A Git remote is preferred. For a repository without one,
                    Junior Mode creates a stable identity that survives path and
                    display-name changes.
                </DialogDescription>
                <Form
                    {...(repository
                        ? updateRepository.form({
                              learner: learnerId,
                              enrolledRepository: repository.id,
                          })
                        : enrollRepository.form(learnerId))}
                    resetOnSuccess={!isEditing}
                    disableWhileProcessing
                    className="grid gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <FormField
                                id={`${inputId}-name`}
                                label="Display name"
                                error={errors.display_name}
                            >
                                <Input
                                    id={`${inputId}-name`}
                                    name="display_name"
                                    defaultValue={repository?.displayName}
                                    placeholder="API service"
                                    required
                                    aria-invalid={Boolean(errors.display_name)}
                                />
                            </FormField>
                            <FormField
                                id={`${inputId}-remote`}
                                label="Git remote"
                                error={errors.remote_url}
                                optional
                                description="SSH and HTTPS remotes for the same repository resolve to one enrollment."
                            >
                                <Input
                                    id={`${inputId}-remote`}
                                    name="remote_url"
                                    defaultValue={
                                        repository?.normalizedRemote ?? ''
                                    }
                                    placeholder="git@github.com:owner/project.git"
                                    aria-invalid={Boolean(errors.remote_url)}
                                />
                            </FormField>
                            <FormField
                                id={`${inputId}-path`}
                                label="Local path"
                                error={errors.local_path}
                                optional
                                description="Stored as editable metadata, never as repository identity."
                            >
                                <Input
                                    id={`${inputId}-path`}
                                    name="local_path"
                                    defaultValue={repository?.localPath ?? ''}
                                    placeholder="/work/project"
                                    aria-invalid={Boolean(errors.local_path)}
                                />
                            </FormField>
                            <DialogFooter>
                                <DialogClose
                                    render={<Button variant="secondary" />}
                                >
                                    Cancel
                                </DialogClose>
                                <SubmitButton
                                    processing={processing}
                                    processingLabel={
                                        isEditing ? 'Saving…' : 'Enrolling…'
                                    }
                                >
                                    {isEditing
                                        ? 'Save changes'
                                        : 'Enroll repository'}
                                </SubmitButton>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function RepositoryList({ learner }: { learner: RepositoryLearner }) {
    if (learner.repositories.length === 0) {
        return (
            <EmptyState
                icon={FolderGit2}
                title="No repositories enrolled"
                description="Junior Mode remains inactive until a repository is explicitly enrolled."
                className="min-h-40"
            />
        );
    }

    return (
        <ul className="grid gap-3" aria-label={`${learner.name} repositories`}>
            {learner.repositories.map((repository) => (
                <li
                    key={repository.id}
                    className="grid gap-4 rounded-lg border bg-background p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                >
                    <div className="grid min-w-0 gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="truncate font-medium">
                                {repository.displayName}
                            </h3>
                            <StatusBadge
                                tone={
                                    repository.status === 'enrolled'
                                        ? 'success'
                                        : 'neutral'
                                }
                            >
                                {repository.status === 'enrolled'
                                    ? 'Enrolled'
                                    : 'Unenrolled'}
                            </StatusBadge>
                        </div>
                        {repository.normalizedRemote && (
                            <p className="truncate text-sm text-muted-foreground">
                                {repository.normalizedRemote}
                            </p>
                        )}
                        {repository.localPath && (
                            <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                                <MapPin
                                    aria-hidden="true"
                                    className="size-4 shrink-0"
                                />
                                <span className="truncate">
                                    {repository.localPath}
                                </span>
                            </p>
                        )}
                        <p className="font-mono text-xs break-all text-muted-foreground">
                            Repository identity: {repository.identity}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <RepositoryEditor
                            learnerId={learner.id}
                            repository={repository}
                        />
                        {repository.status === 'enrolled' ? (
                            <Dialog>
                                <DialogTrigger
                                    render={
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                        />
                                    }
                                >
                                    <PowerOff aria-hidden="true" />
                                    Unenroll
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogTitle>
                                        Unenroll {repository.displayName}?
                                    </DialogTitle>
                                    <DialogDescription>
                                        Future Junior Mode tracking stops
                                        immediately. Existing structured
                                        learning evidence remains available.
                                    </DialogDescription>
                                    <Form
                                        {...unenrollRepository.form({
                                            learner: learner.id,
                                            enrolledRepository: repository.id,
                                        })}
                                        disableWhileProcessing
                                    >
                                        {({ processing }) => (
                                            <DialogFooter>
                                                <DialogClose
                                                    render={
                                                        <Button variant="secondary" />
                                                    }
                                                >
                                                    Cancel
                                                </DialogClose>
                                                <Button
                                                    type="submit"
                                                    variant="destructive"
                                                    disabled={processing}
                                                >
                                                    {processing
                                                        ? 'Unenrolling…'
                                                        : 'Unenroll repository'}
                                                </Button>
                                            </DialogFooter>
                                        )}
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        ) : (
                            <Form
                                {...reenrollRepository.form({
                                    learner: learner.id,
                                    enrolledRepository: repository.id,
                                })}
                                disableWhileProcessing
                            >
                                {({ processing }) => (
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={processing}
                                    >
                                        <Power aria-hidden="true" />
                                        {processing
                                            ? 'Re-enrolling…'
                                            : 'Re-enroll'}
                                    </Button>
                                )}
                            </Form>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function LearnerRepositories({ learner }: { learner: RepositoryLearner }) {
    return (
        <SectionCard
            title={learner.name}
            description={learner.email}
            icon={FolderGit2}
            action={<RepositoryEditor learnerId={learner.id} />}
        >
            <RepositoryList learner={learner} />
        </SectionCard>
    );
}

export default function EnrolledRepositories({
    viewerRole,
    learner,
    learners,
}: Props) {
    const isLearner = viewerRole === 'learner';

    return (
        <>
            <Head title="Enrolled repositories" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    title="Enrolled repositories"
                    description={
                        isLearner
                            ? 'Choose exactly where Junior Mode may coach and record learning evidence.'
                            : 'Manage the repositories where Junior Mode may operate for each Learner.'
                    }
                    eyebrow={
                        isLearner
                            ? 'Learner repository access'
                            : 'Mentor repository access'
                    }
                />

                {isLearner && learner ? (
                    <LearnerRepositories learner={learner} />
                ) : learners.length === 0 ? (
                    <EmptyState
                        icon={Inbox}
                        title="No Learners yet"
                        description="Repository enrollment becomes available after a Learner joins your workspace."
                    />
                ) : (
                    <div className="grid gap-6">
                        {learners.map((currentLearner) => (
                            <LearnerRepositories
                                key={currentLearner.id}
                                learner={currentLearner}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

EnrolledRepositories.layout = {
    breadcrumbs: [
        {
            title: 'Enrolled repositories',
            href: repositories(),
        },
    ],
};
