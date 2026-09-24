import { Form, Head } from '@inertiajs/react';
import { CircleCheck } from 'lucide-react';
import { SubmitButton } from '@/components/submit-button';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Email verification" />

            {status === 'verification-link-sent' && (
                <Alert variant="success" className="mb-6 text-left">
                    <CircleCheck aria-hidden="true" />
                    <AlertDescription>
                        A new verification link has been sent to the email
                        address you provided during registration.
                    </AlertDescription>
                </Alert>
            )}

            <Form {...send.form()} className="space-y-6 text-center">
                {({ processing }) => (
                    <>
                        <SubmitButton
                            processing={processing}
                            processingLabel="Sending…"
                            variant="secondary"
                        >
                            Resend verification email
                        </SubmitButton>

                        <TextLink
                            href={logout()}
                            className="mx-auto block text-sm"
                        >
                            Log out
                        </TextLink>
                    </>
                )}
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Email verification',
    description:
        'Please verify your email address by clicking on the link we just emailed to you.',
};
