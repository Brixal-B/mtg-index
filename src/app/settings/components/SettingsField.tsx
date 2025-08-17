import { ReactNode } from 'react';

interface SettingsFieldProps {
  label: string;
  description?: string;
  children: ReactNode;
  inline?: boolean;
}

export function SettingsField({ label, description, children, inline = false }: SettingsFieldProps) {
  if (inline) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-foreground">
            {label}
          </label>
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}