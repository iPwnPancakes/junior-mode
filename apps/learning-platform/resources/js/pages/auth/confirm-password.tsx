import { Form, Head } from '@inertiajs/react';
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import { FormField } from '@/components/form-field';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import { SubmitButton } from '@/components/submit-button';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirm password" />

            <PasskeyVerify
                routes={{
                    options: confirmOptions(),
                    submit: confirmStore(),
                }}
                label="Confirm with passkey"
                loadingLabel="Confirming..."
                separator="Or confirm with password"
            />

            <Form {...store.form()} resetOnSuccess={['password']}>
                {({ processing, errors }) => (
                    <div className="space-y-6">
                        <FormField
                            id="password"
                            label="Password"
                            error={errors.password}
                        >
                            <PasswordInput
                                id="password"
                                name="password"
                                placeholder="Password"
                                autoComplete="current-password"
                                autoFocus
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={
                                    errors.password
                                        ? 'password-error'
                                        : undefined
                                }
                            />
                        </FormField>

                        <div className="flex items-center">
                            <SubmitButton
                                className="w-full"
                                processing={processing}
                                processingLabel="Confirming…"
                                data-test="confirm-password-button"
                            >
                                Confirm password
                            </SubmitButton>
                        </div>
                    </div>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Confirm password',
    description:
        'This is a secure area of the application. Please confirm your password before continuing.',
};
