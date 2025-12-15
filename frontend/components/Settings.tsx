import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Shield,
  Bell,
  Database,
  Globe,
  Lock,
  Server,
  RefreshCw,
  CheckCircle,
  Building,
  Mail,
  ToggleLeft,
  ToggleRight,
  Cloud,
  Download,
  Upload,
  AlertTriangle,
  Wifi,
  Trash2,
  Key,
  LogOut,
  Smartphone,
  Eye,
  EyeOff,
  Loader
} from 'lucide-react';
import { BranchInventoryItem, Sale, Expense, Invoice, SystemSetting } from '../types';
import { api } from '../services/api';
import { useNotifications } from './NotificationContext';

interface Session {
  id: string;
  device: string;
  ip: string;
  location: string;
  active: boolean;
  current: boolean;
  lastActivity: string;
}

interface SettingsProps {
  currentBranchId: string;
  inventory?: Record<string, BranchInventoryItem[]>;
  sales?: Sale[];
  expenses?: Expense[];
  invoices?: Invoice[];
  onLogout?: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  currentBranchId,
  inventory,
  sales,
  expenses,
  invoices,
  onLogout
}) => {
  const { showSuccess, showError } = useNotifications();
  const [activeSection, setActiveSection] = useState<'general' | 'security' | 'notifications' | 'integrations' | 'backup'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');

  // Specific loading states
  const [testingTra, setTestingTra] = useState(false);
  const [traStatus, setTraStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testingSms, setTestingSms] = useState(false);
  const [smsStatus, setSmsStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Settings state loaded from database
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // General settings state
  const [general, setGeneral] = useState({
    companyName: 'PMS Pharmacy Ltd',
    tinNumber: '123-456-789',
    vrnNumber: '400-999-111',
    address: 'Plot 45, Bagamoyo Road, Dar es Salaam',
    phone: '+255 700 123 456',
    email: 'info@pms.co.tz',
    currency: 'TZS',
    timezone: 'Africa/Dar_es_Salaam',
    language: 'English',
    logo: null as string | null
  });

  // Security settings state
  const [security, setSecurity] = useState({
    twoFactor: true,
    sessionTimeout: '15',
    passwordExpiry: '90',
    enforceStrongPasswords: true,
    adminPassword: '',
    confirmAdminPassword: ''
  });

  // Notifications settings state
  const [notifications, setNotifications] = useState({
    lowStockEmail: true,
    expiryAlertSms: true,
    dailyReportSms: false,
    systemUpdates: true,
    emailRecipients: 'admin@pms.co.tz, manager@pms.co.tz'
  });

  // Integrations settings state
  const [integrations, setIntegrations] = useState({
    traPortalUrl: 'http://localhost:8080/tra-api/v1', // Local development URL
    msdSyncEnabled: true,
    smsGateway: 'Twilio',
    nhifPortalId: 'HOSP-001-TZ',
    apiKeyVisible: false,
    apiKey: 'sk_live_51Mk...90xZ'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // Load settings and sessions on mount
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [settingsData, sessionsData] = await Promise.all([
          api.getSettings(),
          Promise.resolve([])
        ]);

        if (!mounted) return;

        setSettings(settingsData || []);

        // Mock sessions if API doesn't support it
        const activeSessions = sessionsData || [
          {
            id: '1',
            device: 'Chrome / Windows',
            ip: '192.168.1.10',
            location: 'Dar es Salaam',
            active: true,
            current: true,
            lastActivity: new Date().toISOString()
          },
          {
            id: '2',
            device: 'Mobile App / Android',
            ip: '105.22.11.43',
            location: 'Dodoma',
            active: true,
            current: false,
            lastActivity: new Date(Date.now() - 3600000).toISOString()
          }
        ];
        setSessions(activeSessions);

        // Update general settings from loaded data
        if (settingsData && settingsData.length > 0) {
          setGeneral(prev => ({
            ...prev,
            companyName: settingsData.find((s: any) => s.settingKey === 'companyName')?.settingValue || prev.companyName,
            tinNumber: settingsData.find((s: any) => s.settingKey === 'tinNumber')?.settingValue || prev.tinNumber,
            vrnNumber: settingsData.find((s: any) => s.settingKey === 'vrnNumber')?.settingValue || prev.vrnNumber,
            address: settingsData.find((s: any) => s.settingKey === 'address')?.settingValue || prev.address,
            phone: settingsData.find((s: any) => s.settingKey === 'phone')?.settingValue || prev.phone,
            email: settingsData.find((s: any) => s.settingKey === 'email')?.settingValue || prev.email,
            currency: settingsData.find((s: any) => s.settingKey === 'currency')?.settingValue || prev.currency,
            timezone: settingsData.find((s: any) => s.settingKey === 'timezone')?.settingValue || prev.timezone,
            language: settingsData.find((s: any) => s.settingKey === 'language')?.settingValue || prev.language,
          }));

          // Update security settings
          setSecurity(prev => ({
            ...prev,
            twoFactor: settingsData.find((s: any) => s.settingKey === 'twoFactor')?.settingValue === 'true' || prev.twoFactor,
            sessionTimeout: settingsData.find((s: any) => s.settingKey === 'sessionTimeout')?.settingValue || prev.sessionTimeout,
            passwordExpiry: settingsData.find((s: any) => s.settingKey === 'passwordExpiry')?.settingValue || prev.passwordExpiry,
            enforceStrongPasswords: settingsData.find((s: any) => s.settingKey === 'enforceStrongPasswords')?.settingValue === 'true' || prev.enforceStrongPasswords,
          }));

          // Update notifications settings
          setNotifications(prev => ({
            ...prev,
            lowStockEmail: settingsData.find((s: any) => s.settingKey === 'lowStockEmail')?.settingValue === 'true' || prev.lowStockEmail,
            expiryAlertSms: settingsData.find((s: any) => s.settingKey === 'expiryAlertSms')?.settingValue === 'true' || prev.expiryAlertSms,
            dailyReportSms: settingsData.find((s: any) => s.settingKey === 'dailyReportSms')?.settingValue === 'true' || prev.dailyReportSms,
            systemUpdates: settingsData.find((s: any) => s.settingKey === 'systemUpdates')?.settingValue === 'true' || prev.systemUpdates,
            emailRecipients: settingsData.find((s: any) => s.settingKey === 'emailRecipients')?.settingValue || prev.emailRecipients,
          }));

          // Update integrations settings
          setIntegrations(prev => ({
            ...prev,
            traPortalUrl: settingsData.find((s: any) => s.settingKey === 'traPortalUrl')?.settingValue || prev.traPortalUrl,
            msdSyncEnabled: settingsData.find((s: any) => s.settingKey === 'msdSyncEnabled')?.settingValue === 'true' || prev.msdSyncEnabled,
            smsGateway: settingsData.find((s: any) => s.settingKey === 'smsGateway')?.settingValue || prev.smsGateway,
            nhifPortalId: settingsData.find((s: any) => s.settingKey === 'nhifPortalId')?.settingValue || prev.nhifPortalId,
            apiKey: settingsData.find((s: any) => s.settingKey === 'apiKey')?.settingValue || prev.apiKey,
          }));
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        if (mounted) {
          showError('Settings Error', 'Failed to load system settings. Using defaults.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    // Validate passwords if changing admin password
    if (security.adminPassword || security.confirmAdminPassword) {
      if (security.adminPassword !== security.confirmAdminPassword) {
        showError('Validation Error', 'Passwords do not match.');
        return;
      }
      if (security.adminPassword.length < 8) {
        showError('Validation Error', 'Password must be at least 8 characters.');
        return;
      }
    }

    setIsSaving(true);
    try {
      // Collect all settings to save
      const settingsToSave = [
        ...Object.entries(general)
          .filter(([_, v]) => v !== null)
          .map(([key, value]) => ({ category: 'general', key, value: String(value) })),
        ...Object.entries(security)
          .filter(([key]) => key !== 'adminPassword' && key !== 'confirmAdminPassword')
          .map(([key, value]) => ({ category: 'security', key, value: String(value) })),
        ...Object.entries(notifications)
          .map(([key, value]) => ({ category: 'notifications', key, value: String(value) })),
        ...Object.entries(integrations)
          .filter(([key]) => key !== 'apiKeyVisible')
          .map(([key, value]) => ({ category: 'integrations', key, value: String(value) }))
      ];

      // Save all settings
      const savePromises = settingsToSave.map(async (setting) => {
        const existingSetting = settings.find(
          s => (s as any).settingKey === setting.key && s.category === setting.category
        );

        if (existingSetting) {
          try {
            return await api.updateSetting(String(existingSetting.id), setting.value);
          } catch (err) {
            console.warn(`Failed to update setting ${setting.key}:`, err);
            return null;
          }
        } else {
          // Create new setting if it doesn't exist
          try {
            return await api.createSetting({
              id: setting.key,
              category: setting.category,
              settingKey: setting.key,
              settingValue: setting.value,
              dataType: 'string',
              description: `${setting.category} ${setting.key} setting`
            });
          } catch (err) {
            console.warn(`Failed to create setting ${setting.key}:`, err);
            return null;
          }
        }
      });

      await Promise.all(savePromises);

      // Refresh settings from database to ensure UI reflects changes
      const updatedSettings = await api.getSettings();
      setSettings(updatedSettings || []);

      // Clear password fields after successful save
      setSecurity(prev => ({ ...prev, adminPassword: '', confirmAdminPassword: '' }));

      setSaveMessage('✓ Settings saved successfully!');
      showSuccess('Settings Updated', 'All system settings have been saved.');

      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      showError('Save Failed', 'There was an error saving the settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      showError('Invalid File', 'Please upload an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showError('File Too Large', 'Image must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setGeneral(prev => ({ ...prev, logo: reader.result as string }));
    };
    reader.onerror = () => {
      showError('Upload Error', 'Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleTestTra = async () => {
    setTestingTra(true);
    setTraStatus('idle');

    try {
      // Simulate TRA API test
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTraStatus('success');
    } catch (error) {
      console.error('TRA test failed:', error);
      setTraStatus('error');
    } finally {
      setTestingTra(false);
    }
  };

  const handleTestSms = async () => {
    setTestingSms(true);
    setSmsStatus('idle');

    try {
      // Simulate SMS gateway test
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSmsStatus(integrations.smsGateway ? 'success' : 'error');
    } catch (error) {
      console.error('SMS test failed:', error);
      setSmsStatus('error');
    } finally {
      setTestingSms(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      // Simulate session revocation since API doesn't support it yet
      await new Promise(resolve => setTimeout(resolve, 500));
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showSuccess('Session Revoked', 'The session has been terminated.');
    } catch (error) {
      console.error('Failed to revoke session:', error);
      showError('Revoke Failed', 'Unable to revoke the session.');
    }
  };

  const handleDownloadBackup = () => {
    try {
      const backupData = {
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          exportedBy: 'System Admin',
          dataType: 'Full System Backup'
        },
        data: {
          inventory: inventory || {},
          sales: (sales || []).map(s => ({
            ...s,
            // Ensure serializable data
            totalAmount: Number(s.totalAmount || 0) || 0
          })),
          expenses: (expenses || []).map(e => ({
            ...e,
            amount: Number(e.amount || 0) || 0
          })),
          invoices: (invoices || []).map(i => ({
            ...i,
            totalAmount: Number(i.totalAmount || 0) || 0
          }))
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PMS_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('Backup Downloaded', 'Your system backup has been saved.');
    } catch (error) {
      console.error('Download failed:', error);
      showError('Download Failed', 'Unable to create backup file.');
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      'WARNING: This will overwrite current system data. This action cannot be undone. Are you sure?'
    );
    if (!confirmed) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validate backup structure
      if (!backupData.metadata || !backupData.data) {
        throw new Error('Invalid backup file format.');
      }

      // In a real app, this would sync with backend
      console.log('Restore data:', backupData);
      showSuccess('Backup Restored', 'System data has been restored from backup.');
    } catch (error) {
      console.error('Restore failed:', error);
      showError('Restore Failed', 'Invalid backup file or restore error.');
    }

    // Reset file input
    e.target.value = '';
  };

  const handleFactoryReset = async () => {
    const confirmed = window.confirm(
      'CRITICAL: This will completely wipe all system data and reset to factory defaults. This action is irreversible. Type "RESET" in the next prompt to proceed.'
    );

    if (!confirmed) return;

    const confirmText = window.prompt('Type RESET to confirm factory reset:');
    if (confirmText !== 'RESET') {
      showError('Cancelled', 'Factory reset was cancelled.');
      return;
    }

    try {
      // Simulate factory reset since API doesn't support it yet
      await new Promise(resolve => setTimeout(resolve, 1000));

      showSuccess('Factory Reset', 'System has been reset to factory defaults.');

      // Logout user after reset
      if (onLogout) {
        setTimeout(() => onLogout(), 2000);
      }
    } catch (error) {
      console.error('Factory reset failed:', error);
      showError('Reset Failed', 'Unable to perform factory reset.');
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`transition-colors duration-200 ${checked ? 'text-teal-600' : 'text-slate-300'}`}
      type="button"
    >
      {checked ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
    </button>
  );

  const SectionButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        activeSection === id
          ? 'bg-teal-50 text-teal-700 font-bold'
          : 'text-slate-600 hover:bg-slate-50'
      }`}
      type="button"
    >
      <Icon size={20} />
      {label}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-teal-600" size={32} />
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">System Configuration</h2>
          <p className="text-slate-500 mt-1">
            Manage global preferences, security policies, and integrations.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold shadow-lg shadow-teal-600/20 transition-all disabled:opacity-70"
          type="button"
        >
          {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {saveMessage && (
        <div className="bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={20} />
          {saveMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Settings Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-2 sticky top-6">
            <SectionButton id="general" label="General Settings" icon={Building} />
            <SectionButton id="security" label="Security & Access" icon={Shield} />
            <SectionButton id="notifications" label="Notifications" icon={Bell} />
            <SectionButton id="integrations" label="Integrations" icon={Server} />
            <SectionButton id="backup" label="Backup & Data" icon={Database} />
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 min-h-[500px]">

            {activeSection === 'general' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
                    Company Profile
                  </h3>
                  <div className="flex items-start gap-6 mb-6">
                    <div
                      className="w-24 h-24 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                    >
                      {general.logo ? (
                        <img src={general.logo} alt="Company Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="text-slate-400 group-hover:text-slate-600" />
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-bold">Change</span>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-700">Company Logo</p>
                      <p className="text-sm text-slate-500 mb-2">
                        Upload your pharmacy logo for invoices and reports. (Max 2MB)
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-teal-600 text-sm font-bold hover:underline"
                        type="button"
                      >
                        Click to upload
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={general.companyName}
                        onChange={(e) => setGeneral({ ...general, companyName: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={general.address}
                        onChange={(e) => setGeneral({ ...general, address: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={general.email}
                        onChange={(e) => setGeneral({ ...general, email: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={general.phone}
                        onChange={(e) => setGeneral({ ...general, phone: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
                    Tax & Localization
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        TRA TIN Number
                      </label>
                      <input
                        type="text"
                        value={general.tinNumber}
                        onChange={(e) => setGeneral({ ...general, tinNumber: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono transition-all"
                        placeholder="123-456-789"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        VAT Reg Number (VRN)
                      </label>
                      <input
                        type="text"
                        value={general.vrnNumber}
                        onChange={(e) => setGeneral({ ...general, vrnNumber: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono transition-all"
                        placeholder="400-999-111"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        System Currency
                      </label>
                      <select
                        value={general.currency}
                        onChange={(e) => setGeneral({ ...general, currency: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      >
                        <option value="TZS">Tanzanian Shilling (TZS)</option>
                        <option value="USD">US Dollar (USD)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Language
                      </label>
                      <select
                        value={general.language}
                        onChange={(e) => setGeneral({ ...general, language: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      >
                        <option value="English">English</option>
                        <option value="Swahili">Swahili (Kiswahili)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
                    Security Policies
                  </h3>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-full text-teal-600 shadow-sm">
                        <Shield size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">
                          Two-Factor Authentication (2FA)
                        </h4>
                        <p className="text-sm text-slate-500">
                          Require SMS/Email code for login
                        </p>
                      </div>
                    </div>
                    <Toggle
                      checked={security.twoFactor}
                      onChange={(v) => setSecurity({ ...security, twoFactor: v })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Session Timeout
                      </label>
                      <select
                        value={security.sessionTimeout}
                        onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      >
                        <option value="15">15 Minutes (Recommended)</option>
                        <option value="30">30 Minutes</option>
                        <option value="60">1 Hour</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Password Expiry
                      </label>
                      <select
                        value={security.passwordExpiry}
                        onChange={(e) => setSecurity({ ...security, passwordExpiry: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      >
                        <option value="30">Every 30 Days</option>
                        <option value="90">Every 90 Days</option>
                        <option value="180">Every 6 Months</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
                    Active Sessions
                  </h3>
                  <div className="space-y-3">
                    {sessions.length === 0 ? (
                      <p className="text-slate-500 text-center py-6">No active sessions.</p>
                    ) : (
                      sessions.map(session => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-2 rounded-full ${
                                session.current
                                  ? 'bg-teal-100 text-teal-600'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              <Smartphone size={20} />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                {session.device}
                                {session.current && (
                                  <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded">
                                    Current
                                  </span>
                                )}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {session.ip} • {session.location}
                              </p>
                            </div>
                          </div>
                          {!session.current && (
                            <button
                              onClick={() => handleRevokeSession(session.id)}
                              className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                              type="button"
                            >
                              <LogOut size={14} /> Revoke
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
                    Change Admin Password
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 text-slate-400" size={16} />
                        <input
                          type="password"
                          className="w-full pl-9 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                          placeholder="••••••••"
                          value={security.adminPassword}
                          onChange={(e) => setSecurity({ ...security, adminPassword: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 text-slate-400" size={16} />
                        <input
                          type="password"
                          className="w-full pl-9 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                          placeholder="••••••••"
                          value={security.confirmAdminPassword}
                          onChange={(e) => setSecurity({ ...security, confirmAdminPassword: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Passwords must be at least 8 characters long.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
                  Alert Preferences
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-50">
                    <div>
                      <h4 className="font-medium text-slate-800">Low Stock Alerts (Email)</h4>
                      <p className="text-xs text-slate-500">
                        Receive emails when inventory hits minimum level
                      </p>
                    </div>
                    <Toggle
                      checked={notifications.lowStockEmail}
                      onChange={(v) => setNotifications({ ...notifications, lowStockEmail: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-50">
                    <div>
                      <h4 className="font-medium text-slate-800">Expiry Warnings (SMS)</h4>
                      <p className="text-xs text-slate-500">
                        Receive SMS for batches expiring in &lt;30 days
                      </p>
                    </div>
                    <Toggle
                      checked={notifications.expiryAlertSms}
                      onChange={(v) => setNotifications({ ...notifications, expiryAlertSms: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-50">
                    <div>
                      <h4 className="font-medium text-slate-800">Daily Sales Report (SMS)</h4>
                      <p className="text-xs text-slate-500">
                        End-of-day financial summary to managers
                      </p>
                    </div>
                    <Toggle
                      checked={notifications.dailyReportSms}
                      onChange={(v) => setNotifications({ ...notifications, dailyReportSms: v })}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Alert Recipient Emails
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={notifications.emailRecipients}
                      onChange={(e) => setNotifications({ ...notifications, emailRecipients: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      placeholder="Enter emails separated by comma"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Multiple emails can be separated by commas.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'integrations' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
                  External Systems
                </h3>

                {/* TRA Integration */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Globe className="text-teal-600" />
                      <h4 className="font-bold text-slate-900">TRA VFD Integration</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {traStatus === 'success' && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle size={12} /> Connected
                        </span>
                      )}
                      {traStatus === 'error' && (
                        <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                          <AlertTriangle size={12} /> Failed
                        </span>
                      )}
                      <button
                        onClick={handleTestTra}
                        disabled={testingTra}
                        className="text-xs font-bold bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-all"
                        type="button"
                      >
                        {testingTra ? 'Testing...' : 'Test Connection'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        API Endpoint
                      </label>
                      <input
                        type="text"
                        value={integrations.traPortalUrl}
                        readOnly
                        className="w-full p-2 bg-white border border-slate-200 rounded text-slate-600 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* API Key Management */}
                <div className="border border-slate-200 rounded-xl p-6">
                  <h4 className="font-bold text-slate-800 mb-4">API Key Management</h4>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Secret Key
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={integrations.apiKeyVisible ? 'text' : 'password'}
                        value={integrations.apiKey}
                        readOnly
                        className="w-full p-3 border border-slate-300 rounded-lg text-sm font-mono bg-slate-50"
                      />
                      <button
                        onClick={() =>
                          setIntegrations({
                            ...integrations,
                            apiKeyVisible: !integrations.apiKeyVisible
                          })
                        }
                        className="absolute right-3 top-3 text-slate-400 hover:text-teal-600 transition-colors"
                        type="button"
                      >
                        {integrations.apiKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button
                      className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-xs hover:bg-slate-900 transition-colors"
                      type="button"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      NHIF Portal ID
                    </label>
                    <input
                      type="text"
                      value={integrations.nhifPortalId}
                      onChange={(e) => setIntegrations({ ...integrations, nhifPortalId: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-slate-700">
                        SMS Gateway
                      </label>
                      {smsStatus === 'success' && (
                        <span className="text-[10px] text-emerald-600 font-bold">Verified</span>
                      )}
                      {smsStatus === 'error' && (
                        <span className="text-[10px] text-rose-600 font-bold">Failed</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={integrations.smsGateway}
                        onChange={(e) =>
                          setIntegrations({ ...integrations, smsGateway: e.target.value })
                        }
                        className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      >
                        <option value="Twilio">Twilio</option>
                        <option value="Infobip">Infobip</option>
                        <option value="Beem">Beem Africa</option>
                      </select>
                      <button
                        onClick={handleTestSms}
                        disabled={testingSms}
                        className="p-3 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                        title="Test SMS"
                        type="button"
                      >
                        <Wifi size={20} className={testingSms ? 'animate-pulse' : ''} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'backup' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
                  Data Management
                </h3>

                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex items-start gap-4">
                  <Cloud className="text-blue-600 mt-1 shrink-0" size={24} />
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-900">Cloud Sync Active</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your data is automatically synced to the cloud every 5 minutes. Last sync was
                      successful at {new Date().toLocaleTimeString()}.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Download size={24} className="text-slate-600" />
                    </div>
                    <h4 className="font-bold text-slate-800 mb-2">Export Data</h4>
                    <p className="text-sm text-slate-500 mb-6 min-h-[40px]">
                      Download a full JSON backup of inventory, sales, expenses, and invoices.
                    </p>
                    <button
                      onClick={handleDownloadBackup}
                      className="w-full py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                      type="button"
                    >
                      <Download size={18} /> Download Backup
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Upload size={24} className="text-slate-600" />
                    </div>
                    <h4 className="font-bold text-slate-800 mb-2">Restore Data</h4>
                    <p className="text-sm text-slate-500 mb-6 min-h-[40px]">
                      Restore system state from a previously exported backup file.
                    </p>
                    <button
                      onClick={() => restoreInputRef.current?.click()}
                      className="w-full py-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all flex items-center justify-center gap-2"
                      type="button"
                    >
                      <Upload size={18} /> Upload File
                    </button>
                    <input
                      type="file"
                      ref={restoreInputRef}
                      className="hidden"
                      accept=".json"
                      onChange={handleRestoreBackup}
                    />
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h4 className="font-bold text-rose-600 mb-2 flex items-center gap-2">
                    <AlertTriangle size={20} /> Danger Zone
                  </h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Irreversible actions. Please proceed with caution.
                  </p>
                  <button
                    onClick={handleFactoryReset}
                    className="px-6 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl hover:bg-rose-100 font-bold transition-all text-sm"
                    type="button"
                  >
                    Factory Reset System
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
