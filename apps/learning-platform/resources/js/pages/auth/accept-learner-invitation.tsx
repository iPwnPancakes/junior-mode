import { Form, Head } from '@inertiajs/react';
import { UserRoundPlus } from 'lucide-react';
import { FormField } from '@/components/form-field';
import PasswordInput from '@/components/password-input';
import { SubmitButton } from '@/components/submit-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { store } from '@/routes/learner-invitations/accept';

type Props = {
    email: string;
    mentorName: string;
    passwordRules: string;
    token: string;
};

export default function AcceptLearnerInvitation({
    email,
    mentorName,
    passwordRules,
    token,
}: Props) {
    return (
        <>
            <Head title="Accept Learner invitation" />
            <Form
                {...store.form(token)}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <Alert variant="info">
                            <UserRoundPlus aria-hidden="true" />
                            <AlertDescription>
                                <span className="font-medium">
                                    {mentorName}
                                </span>{' '}
                                invited{' '}
                                <span className="font-medium">{email}</span> to
                                join as a Learner.
                            </AlertDescription>
                        </Alert>

                        <div className="grid gap-6">
                            <FormField
                                id="name"
                                label="Name"
                                error={errors.name}
                            >
                                <Input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    autoFocus
                                    required
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={
                                        errors.name ? 'name-error' : undefined
                                    }
                                />
                            </FormField>

                            <FormField
                                id="password"
                                label="Password"
                                error={errors.password}
                            >
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    autoComplete="new-password"
                                    passwordrules={passwordRules}
                                    required
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={
                                        errors.password
                                            ? 'password-error'
                                            : undefined
                                    }
                                />
                            </FormField>

                            <FormField
                                id="password_confirmation"
                                label="Confirm password"
                                error={errors.password_confirmation}
                            >
                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    autoComplete="new-password"
                                    passwordrules={passwordRules}
                                    required
                                    aria-invalid={Boolean(
                                        errors.password_confirmation,
                                    )}
                                    aria-describedby={
                                        errors.password_confirmation
                                            ? 'password_confirmation-error'
                                            : undefined
                                    }
                                />
                            </FormField>

                            <SubmitButton
                                processing={processing}
                                processingLabel="Joining workspace…"
                            >
                                Join as a Learner
                            </SubmitButton>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

AcceptLearnerInvitation.layout = {
    title: 'Join your Junior Mode workspace',
    description: 'Create your Learner account from this private invitation',
};
