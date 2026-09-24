import { Monitor, Moon, Sun } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';

export default function AppearanceToggleTab({
    className = '',
}: {
    className?: string;
}) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
    ] satisfies Array<{
        value: Appearance;
        icon: typeof Sun;
        label: string;
    }>;

    return (
        <ToggleGroup
            value={[appearance]}
            onValueChange={(values) => {
                const value = values[0] as Appearance | undefined;

                if (value !== undefined) {
                    updateAppearance(value);
                }
            }}
            variant="outline"
            className={className}
            aria-label="Color theme"
        >
            {tabs.map(({ value, icon: Icon, label }) => (
                <ToggleGroupItem
                    key={value}
                    value={value}
                    aria-label={`Use ${label.toLowerCase()} theme`}
                    className="gap-2 px-3"
                >
                    <Icon aria-hidden="true" className="size-4" />
                    <span className="text-sm">{label}</span>
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
