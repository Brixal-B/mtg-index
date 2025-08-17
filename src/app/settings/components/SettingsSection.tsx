import { ReactNode } from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">{title}</h2>
        {description && (
          <p className="text-muted-foreground mb-6">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}