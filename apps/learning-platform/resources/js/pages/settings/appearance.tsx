import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import { SectionHeading } from '@/components/section-heading';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Appearance settings" />

            <div className="space-y-6">
                <SectionHeading
                    title="Appearance settings"
                    description="Update the appearance settings for your account"
                />
                <AppearanceTabs />
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
