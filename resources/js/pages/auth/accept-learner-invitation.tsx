import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
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
                        <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                            <span className="font-medium">{mentorName}</span>{' '}
                            invited <span className="font-medium">{email}</span>{' '}
                            to join as a Learner.
                        </div>

                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    autoFocus
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    autoComplete="new-password"
                                    passwordrules={passwordRules}
                                    required
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm password
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    autoComplete="new-password"
                                    passwordrules={passwordRules}
                                    required
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Join as a Learner
                            </Button>
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
