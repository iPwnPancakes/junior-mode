import { Form, Head } from '@inertiajs/react';
import { CircleCheck } from 'lucide-react';
import { FormField } from '@/components/form-field';
import { SubmitButton } from '@/components/submit-button';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Forgot password" />

            {status && (
                <Alert variant="success" className="mb-6">
                    <CircleCheck aria-hidden="true" />
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-6">
                <Form {...email.form()}>
                    {({ processing, errors }) => (
                        <>
                            <FormField
                                id="email"
                                label="Email address"
                                error={errors.email}
                            >
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="off"
                                    autoFocus
                                    placeholder="email@example.com"
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={
                                        errors.email ? 'email-error' : undefined
                                    }
                                />
                            </FormField>

                            <div className="my-6 flex items-center justify-start">
                                <SubmitButton
                                    className="w-full"
                                    processing={processing}
                                    processingLabel="Sending link…"
                                    data-test="email-password-reset-link-button"
                                >
                                    Email password reset link
                                </SubmitButton>
                            </div>
                        </>
                    )}
                </Form>

                <div className="space-x-1 text-center text-sm text-muted-foreground">
                    <span>Or, return to</span>
                    <TextLink href={login()}>log in</TextLink>
                </div>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Forgot password',
    description: 'Enter your email to receive a password reset link',
};
