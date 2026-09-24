import { Form, Head, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { CircleCheck, MailWarning } from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import { FormField } from '@/components/form-field';
import { SectionHeading } from '@/components/section-heading';
import { SubmitButton } from '@/components/submit-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Profile settings" />

            <div className="space-y-6">
                <SectionHeading
                    title="Profile"
                    description="Update your name and email address"
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <FormField
                                id="name"
                                label="Name"
                                error={errors.name}
                            >
                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={
                                        errors.name ? 'name-error' : undefined
                                    }
                                />
                            </FormField>

                            <FormField
                                id="email"
                                label="Email address"
                                error={errors.email}
                            >
                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Email address"
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={
                                        errors.email ? 'email-error' : undefined
                                    }
                                />
                            </FormField>

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <Alert variant="warning">
                                        <MailWarning aria-hidden="true" />
                                        <AlertDescription>
                                            <p>
                                                Your email address is
                                                unverified.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className={buttonVariants({
                                                        variant: 'link',
                                                        className: 'h-auto p-0',
                                                    })}
                                                >
                                                    Re-send the verification
                                                    email.
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <p className="flex items-center gap-2 font-medium">
                                                    <CircleCheck
                                                        aria-hidden="true"
                                                        className="size-4"
                                                    />
                                                    A new verification link has
                                                    been sent to your email
                                                    address.
                                                </p>
                                            )}
                                        </AlertDescription>
                                    </Alert>
                                )}

                            <div className="flex items-center gap-4">
                                <SubmitButton
                                    processing={processing}
                                    processingLabel="Saving…"
                                    data-test="update-profile-button"
                                >
                                    Save
                                </SubmitButton>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
