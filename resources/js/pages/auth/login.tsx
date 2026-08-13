import { Form, Head } from '@inertiajs/react';
import { CircleCheck } from 'lucide-react';
import { FormField } from '@/components/form-field';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import { SubmitButton } from '@/components/submit-button';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    return (
        <>
            <Head title="Log in" />

            <PasskeyVerify />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <FormField
                                id="email"
                                label="Email address"
                                error={errors.email}
                            >
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
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
                                labelAction={
                                    canResetPassword ? (
                                        <TextLink
                                            href={request()}
                                            className="text-xs"
                                            tabIndex={5}
                                        >
                                            Forgot your password?
                                        </TextLink>
                                    ) : null
                                }
                            >
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Password"
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={
                                        errors.password
                                            ? 'password-error'
                                            : undefined
                                    }
                                />
                            </FormField>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember">Remember me</Label>
                            </div>

                            <SubmitButton
                                className="mt-4 w-full"
                                tabIndex={4}
                                processing={processing}
                                processingLabel="Logging in…"
                                data-test="login-button"
                            >
                                Log in
                            </SubmitButton>
                        </div>

                        {canRegister && (
                            <div className="text-center text-sm text-muted-foreground">
                                Setting up this installation?{' '}
                                <TextLink href={register()} tabIndex={5}>
                                    Create the Mentor account
                                </TextLink>
                            </div>
                        )}
                    </>
                )}
            </Form>

            {status && (
                <Alert variant="success" className="mt-6">
                    <CircleCheck aria-hidden="true" />
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
    description: 'Enter your email and password to open your workspace',
};
