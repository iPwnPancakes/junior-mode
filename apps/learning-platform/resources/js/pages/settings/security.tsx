import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import { FormField } from '@/components/form-field';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
import PasswordInput from '@/components/password-input';
import { SectionHeading } from '@/components/section-heading';
import { SubmitButton } from '@/components/submit-button';
import { edit } from '@/routes/security';

type Props = {
    passwordRules: string;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Security settings" />

            <div className="space-y-6">
                <SectionHeading
                    title="Update password"
                    description="Ensure your account is using a long, random password to stay secure"
                />

                <Form
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="space-y-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <FormField
                                id="current_password"
                                label="Current password"
                                error={errors.current_password}
                            >
                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    className="mt-1 block w-full"
                                    autoComplete="current-password"
                                    placeholder="Current password"
                                    aria-invalid={Boolean(
                                        errors.current_password,
                                    )}
                                    aria-describedby={
                                        errors.current_password
                                            ? 'current_password-error'
                                            : undefined
                                    }
                                />
                            </FormField>

                            <FormField
                                id="password"
                                label="New password"
                                error={errors.password}
                            >
                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    className="mt-1 block w-full"
                                    autoComplete="new-password"
                                    placeholder="New password"
                                    passwordrules={props.passwordRules}
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
                                    className="mt-1 block w-full"
                                    autoComplete="new-password"
                                    placeholder="Confirm password"
                                    passwordrules={props.passwordRules}
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

                            <div className="flex items-center gap-4">
                                <SubmitButton
                                    processing={processing}
                                    processingLabel="Saving…"
                                    data-test="update-password-button"
                                >
                                    Save
                                </SubmitButton>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <ManageTwoFactor
                canManageTwoFactor={props.canManageTwoFactor}
                requiresConfirmation={props.requiresConfirmation}
                twoFactorEnabled={props.twoFactorEnabled}
            />

            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Security settings',
            href: edit(),
        },
    ],
};
