'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Palette, 
  Bell, 
  Database, 
  Save,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { UserPreferences, PriceAlert } from '@/lib/types';
import { getPreferences, savePreferences } from '@/lib/storage';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { SettingsSection } from './components/SettingsSection';
import { SettingsField } from './components/SettingsField';
import { ToggleSwitch } from './components/ToggleSwitch';
import { CreatePriceAlertModal } from './components/CreatePriceAlertModal';
import { DatabaseStatusIndicator } from '../admin/components/DatabaseStatusIndicator';

const SETTINGS_SECTIONS = [
  { id: 'general', name: 'General', icon: User },
  { id: 'appearance', name: 'Appearance', icon: Palette },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'data', name: 'Data Management', icon: Database },
] as const;

type SettingsSection = typeof SETTINGS_SECTIONS[number]['id'];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    const loadPreferences = () => {
      try {
        const savedPreferences = getPreferences();
        setPreferences(savedPreferences);
      } catch (error) {
        console.error('Error loading preferences:', error);
        // Set default preferences
        const defaultPreferences: UserPreferences = {
          defaultCurrency: 'usd',
          showFoilPrices: true,
          defaultCondition: 'near_mint',
          priceAlerts: [],
          dashboardLayout: ['portfolio', 'analytics', 'cards', 'admin'],
          theme: 'dark',
        };
        setPreferences(defaultPreferences);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [isClient]);

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    if (!preferences) return;
    
    setPreferences(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!preferences || !hasChanges) return;
    
    setSaving(true);
    try {
      savePreferences(preferences);
      setHasChanges(false);
      // Show success feedback (you could add a toast here)
      console.log('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Show error feedback
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }
    
    const defaultPreferences: UserPreferences = {
      defaultCurrency: 'usd',
      showFoilPrices: true,
      defaultCondition: 'near_mint',
      priceAlerts: [],
      dashboardLayout: ['portfolio', 'analytics', 'cards', 'admin'],
      theme: 'dark',
    };
    
    setPreferences(defaultPreferences);
    setHasChanges(true);
  };

  if (loading || !preferences) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Customize your MTG Tracker experience
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{section.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-lg p-6">
            {activeSection === 'general' && (
              <GeneralSettings 
                preferences={preferences}
                onPreferenceChange={handlePreferenceChange}
              />
            )}
            {activeSection === 'appearance' && (
              <AppearanceSettings 
                preferences={preferences}
                onPreferenceChange={handlePreferenceChange}
              />
            )}
            {activeSection === 'notifications' && (
              <NotificationSettings 
                preferences={preferences}
                onPreferenceChange={handlePreferenceChange}
              />
            )}
            {activeSection === 'data' && (
              <DataManagementSettings />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// General Settings Component
function GeneralSettings({ 
  preferences, 
  onPreferenceChange 
}: { 
  preferences: UserPreferences;
  onPreferenceChange: (key: keyof UserPreferences, value: any) => void;
}) {
  return (
    <SettingsSection 
      title="General Settings" 
      description="Configure basic application preferences and defaults."
    >
      <div className="space-y-6">
        {/* Default Currency */}
        <SettingsField
          label="Default Currency"
          description="Choose your preferred currency for displaying card prices."
        >
          <select
            value={preferences.defaultCurrency}
            onChange={(e) => onPreferenceChange('defaultCurrency', e.target.value as 'usd' | 'eur')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="usd">USD ($)</option>
            <option value="eur">EUR (€)</option>
          </select>
        </SettingsField>

        {/* Show Foil Prices */}
        <SettingsField
          label="Show Foil Prices"
          description="Display foil prices alongside regular card prices."
          inline
        >
          <ToggleSwitch
            checked={preferences.showFoilPrices}
            onChange={(checked) => onPreferenceChange('showFoilPrices', checked)}
          />
        </SettingsField>

        {/* Default Card Condition */}
        <SettingsField
          label="Default Card Condition"
          description="Default condition when adding new cards to your portfolio."
        >
          <select
            value={preferences.defaultCondition}
            onChange={(e) => onPreferenceChange('defaultCondition', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="mint">Mint</option>
            <option value="near_mint">Near Mint</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="light_played">Light Played</option>
            <option value="played">Played</option>
            <option value="poor">Poor</option>
          </select>
        </SettingsField>
      </div>
    </SettingsSection>
  );
}

// Appearance Settings Component
function AppearanceSettings({ 
  preferences, 
  onPreferenceChange 
}: { 
  preferences: UserPreferences;
  onPreferenceChange: (key: keyof UserPreferences, value: any) => void;
}) {
  const { theme, setTheme, actualTheme } = useTheme();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    onPreferenceChange('theme', newTheme);
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Light theme' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark theme' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
  ] as const;

  return (
    <SettingsSection 
      title="Appearance" 
      description="Customize the look and layout of your dashboard."
    >
      <div className="space-y-6">
        {/* Theme Settings */}
        <SettingsField
          label="Theme"
          description="Choose your preferred color theme for the application."
        >
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = (preferences.theme || theme) === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleThemeChange(option.value)}
                  className={`
                    relative flex flex-col items-center p-4 rounded-lg border-2 transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                >
                  <Icon className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs opacity-75 mt-1">{option.description}</span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
          {theme === 'system' && (
            <p className="text-xs text-muted-foreground mt-2">
              Currently using {actualTheme} mode (system preference)
            </p>
          )}
        </SettingsField>

        {/* Dashboard Layout */}
        <SettingsField
          label="Dashboard Layout"
          description="Reorder dashboard sections according to your preference."
        >
          <div className="space-y-2">
            {preferences.dashboardLayout.map((item, index) => (
              <div key={item} className="flex items-center justify-between p-3 border border-border rounded-lg bg-accent/50">
                <span className="text-sm font-medium capitalize">{item}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const newLayout = [...preferences.dashboardLayout];
                      if (index > 0) {
                        [newLayout[index], newLayout[index - 1]] = [newLayout[index - 1], newLayout[index]];
                        onPreferenceChange('dashboardLayout', newLayout);
                      }
                    }}
                    disabled={index === 0}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => {
                      const newLayout = [...preferences.dashboardLayout];
                      if (index < newLayout.length - 1) {
                        [newLayout[index], newLayout[index + 1]] = [newLayout[index + 1], newLayout[index]];
                        onPreferenceChange('dashboardLayout', newLayout);
                      }
                    }}
                    disabled={index === preferences.dashboardLayout.length - 1}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SettingsField>
      </div>
    </SettingsSection>
  );
}

// Notification Settings Component
function NotificationSettings({ 
  preferences, 
  onPreferenceChange 
}: { 
  preferences: UserPreferences;
  onPreferenceChange: (key: keyof UserPreferences, value: any) => void;
}) {
  const [showCreateAlertModal, setShowCreateAlertModal] = useState(false);

  const handleCreateAlert = (alert: PriceAlert) => {
    const newAlerts = [...preferences.priceAlerts, alert];
    onPreferenceChange('priceAlerts', newAlerts);
  };

  return (
    <>
      <SettingsSection 
        title="Notifications" 
        description="Manage price alerts and notification preferences."
      >
        <div className="space-y-6">
          {/* Price Alerts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Price Alerts</h3>
              <button 
                onClick={() => setShowCreateAlertModal(true)}
                className="text-sm text-primary hover:text-primary/80"
              >
                + Add Alert
              </button>
            </div>
            
            {preferences.priceAlerts.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No price alerts set</p>
                <p className="text-xs text-muted-foreground">
                  Create alerts to be notified when card prices change.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {preferences.priceAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Card Alert</p>
                      <p className="text-xs text-muted-foreground">
                        Alert when price goes {alert.condition} ${alert.targetPrice.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newAlerts = preferences.priceAlerts.filter(a => a.id !== alert.id);
                        onPreferenceChange('priceAlerts', newAlerts);
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notification Preferences Placeholder */}
          <div className="p-4 border border-dashed border-border rounded-lg">
            <div className="text-center space-y-2">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-medium text-foreground">Email & Push Notifications</h3>
              <p className="text-xs text-muted-foreground">
                Advanced notification settings coming soon!
              </p>
            </div>
          </div>
        </div>
      </SettingsSection>

      <CreatePriceAlertModal
        isOpen={showCreateAlertModal}
        onClose={() => setShowCreateAlertModal(false)}
        onCreateAlert={handleCreateAlert}
      />
    </>
  );
}

// Data Management Settings Component
function DataManagementSettings() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // This would implement actual data export
      const data = {
        portfolios: JSON.parse(localStorage.getItem('mtg-portfolios') || '[]'),
        preferences: JSON.parse(localStorage.getItem('mtg-preferences') || '{}'),
        exportDate: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mtg-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (confirm('This will replace all your current data. Are you sure you want to continue?')) {
          if (data.portfolios) {
            localStorage.setItem('mtg-portfolios', JSON.stringify(data.portfolios));
          }
          if (data.preferences) {
            localStorage.setItem('mtg-preferences', JSON.stringify(data.preferences));
          }
          
          // Reload the page to reflect changes
          window.location.reload();
        }
      } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import data. Please check the file format.');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllData = () => {
    if (!confirm('This will permanently delete ALL your data including portfolios, preferences, and settings. This cannot be undone. Are you sure?')) {
      return;
    }
    
    if (!confirm('This is your final warning. ALL DATA WILL BE LOST. Continue?')) {
      return;
    }
    
    // Clear all localStorage data
    localStorage.removeItem('mtg-portfolios');
    localStorage.removeItem('mtg-preferences');
    localStorage.removeItem('mtg-watchlist');
    
    // Reload the page
    window.location.reload();
  };

  return (
    <SettingsSection 
      title="Data Management" 
      description="Import, export, and manage your MTG Tracker data."
    >
      <div className="space-y-6">
        {/* MTGJSON Database Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">MTGJSON Database Status</h3>
          <p className="text-xs text-muted-foreground">
            Monitor the status of your historical price data and manage MTGJSON integration.
          </p>
          <DatabaseStatusIndicator showActions={true} />
        </div>
        {/* Export Data */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Export Data</h3>
          <p className="text-xs text-muted-foreground">
            Download a backup of all your portfolios and settings.
          </p>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Exporting...' : 'Export Data'}</span>
          </button>
        </div>

        {/* Import Data */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Import Data</h3>
          <p className="text-xs text-muted-foreground">
            Restore your data from a previous backup. This will replace all current data.
          </p>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
              id="import-file"
              disabled={isImporting}
            />
            <label
              htmlFor="import-file"
              className="flex items-center space-x-2 px-4 py-2 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>{isImporting ? 'Importing...' : 'Import Data'}</span>
            </label>
          </div>
        </div>

        {/* Reset All Data */}
        <div className="space-y-3 pt-6 border-t border-border">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-medium text-foreground">Danger Zone</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Permanently delete all your data. This action cannot be undone.
          </p>
          <button
            onClick={handleResetAllData}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Reset All Data</span>
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}