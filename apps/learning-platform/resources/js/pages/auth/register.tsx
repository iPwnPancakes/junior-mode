import { Form, Head } from '@inertiajs/react';
import { FormField } from '@/components/form-field';
import PasswordInput from '@/components/password-input';
import { SubmitButton } from '@/components/submit-button';
import TextLink from '@/components/text-link';
import { Input } from '@/components/ui/input';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    return (
        <>
            <Head title="Register" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <FormField
                                id="name"
                                label="Name"
                                error={errors.name}
                            >
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
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
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="email@example.com"
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={
                                        errors.email ? 'email-error' : undefined
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
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Password"
                                    passwordrules={passwordRules}
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
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Confirm password"
                                    passwordrules={passwordRules}
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
                                className="mt-2 w-full"
                                tabIndex={5}
                                processing={processing}
                                processingLabel="Creating account…"
                                data-test="register-user-button"
                            >
                                Create account
                            </SubmitButton>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink href={login()} tabIndex={6}>
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create the primary Mentor account',
    description: 'This account will own your private Junior Mode installation',
};
