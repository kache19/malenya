
import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Activity, 
  Settings, 
  LogOut, 
  Menu,
  Stethoscope,
  Banknote,
  Store,
  MapPin,
  Users,
  Lock,
  ClipboardCheck,
  Archive
} from 'lucide-react';
import { Staff, UserRole, Branch } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentBranchId: string;
  setCurrentBranchId: (id: string) => void;
  currentUser: Staff | null;
  onLogout: () => void;
  branches: Branch[];
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  currentBranchId, 
  setCurrentBranchId, 
  currentUser, 
  onLogout,
  branches 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Role-Based Access Control Map
  const rolePermissions: Record<UserRole, string[]> = {
    [UserRole.SUPER_ADMIN]: ['dashboard', 'approvals', 'pos', 'inventory', 'clinical', 'finance', 'staff', 'branches', 'reports', 'archive', 'settings'],
    [UserRole.BRANCH_MANAGER]: ['dashboard', 'pos', 'inventory', 'clinical', 'finance', 'staff', 'reports', 'archive'],
    [UserRole.PHARMACIST]: ['dashboard', 'inventory', 'clinical'],
    [UserRole.CASHIER]: ['pos', 'finance'],
    [UserRole.INVENTORY_CONTROLLER]: ['dashboard', 'inventory', 'reports'],
    [UserRole.ACCOUNTANT]: ['dashboard', 'finance', 'reports', 'archive'],
    [UserRole.AUDITOR]: ['dashboard', 'reports', 'finance', 'archive']
  };

  const userPerms = currentUser ? rolePermissions[currentUser.role] : [];

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'approvals', label: 'Approvals', icon: ClipboardCheck },
    { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'clinical', label: 'Clinical & Rx', icon: Stethoscope },
    { id: 'finance', label: 'Finance', icon: Banknote },
    { id: 'staff', label: 'Staff & Roles', icon: Users },
    { id: 'branches', label: 'Branches', icon: Store },
    { id: 'reports', label: 'Reports', icon: Activity },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const menuItems = allMenuItems.filter(item => userPerms.includes(item.id));
  const activeBranchName = branches.find(b => b.id === currentBranchId)?.name || 'Unknown Branch';
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  return (
    <div id="app-layout" className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-teal-900 text-white shadow-xl no-print">
        <div className="p-6 border-b border-teal-800">
          <h1 className="text-2xl font-bold tracking-tight">PMS<span className="text-teal-400">.</span></h1>
          <p className="text-xs text-teal-300 mt-1">Pharmacy Management</p>
        </div>

        {/* Branch Switcher (Only for Super Admin) */}
        <div className="px-4 pt-4 pb-2">
           <label className="text-xs text-teal-400 uppercase font-semibold tracking-wider mb-2 block">
             Current Context
           </label>
           
           {isSuperAdmin ? (
             <div className="relative">
               <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-200" />
               <select 
                 value={currentBranchId}
                 onChange={(e) => setCurrentBranchId(e.target.value)}
                 className="w-full pl-9 pr-3 py-2 bg-teal-800 border border-teal-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
               >
                 {branches.map(branch => (
                   <option key={branch.id} value={branch.id}>
                     {branch.name}
                   </option>
                 ))}
               </select>
             </div>
           ) : (
             <div className="flex items-center gap-2 p-2 bg-teal-800 rounded-lg text-sm text-teal-100 border border-teal-700">
                <Lock size={14} className="text-teal-400" />
                <span className="truncate">{activeBranchName}</span>
             </div>
           )}

           {currentBranchId !== 'HEAD_OFFICE' && (
             <div className="mt-2 flex items-center text-xs text-teal-300 px-1">
               <MapPin size={12} className="mr-1" />
               {branches.find(b => b.id === currentBranchId)?.location}
             </div>
           )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-teal-700 text-white shadow-md transform scale-[1.02]' 
                  : 'text-teal-100 hover:bg-teal-800 hover:text-white'
              }`}
            >
              <item.icon size={20} className="mr-3" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-teal-800">
          <div className="flex items-center gap-3 px-4 py-2 text-teal-100">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center font-bold uppercase">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser?.name}</p>
              <p className="text-xs text-teal-400 truncate capitalize">{currentUser?.role.replace('_', ' ').toLowerCase()}</p>
            </div>
            <button onClick={onLogout} title="Logout">
                <LogOut size={18} className="cursor-pointer hover:text-white" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Overlay */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-teal-900 text-white shadow-md z-20 no-print">
          <div>
            <h1 className="text-xl font-bold">PMS</h1>
            <p className="text-xs text-teal-300">{activeBranchName}</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu size={24} />
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute inset-0 z-30 bg-teal-900/95 backdrop-blur-sm p-6 animate-in fade-in slide-in-from-top-10 no-print">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-white">
                <LogOut size={24} className="rotate-180" />
              </button>
            </div>
            {/* Mobile Branch Switcher */}
            {isSuperAdmin && (
            <div className="mb-6">
               <label className="text-sm text-teal-300 block mb-2">Switch Branch</label>
               <select 
                 value={currentBranchId}
                 onChange={(e) => {
                   setCurrentBranchId(e.target.value);
                   setIsMobileMenuOpen(false);
                 }}
                 className="w-full p-3 bg-teal-800 text-white rounded-lg border border-teal-700"
               >
                 {branches.map(branch => (
                   <option key={branch.id} value={branch.id}>{branch.name}</option>
                 ))}
               </select>
            </div>
            )}
            <nav className="space-y-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center w-full px-4 py-4 rounded-xl text-lg ${
                    activeTab === item.id ? 'bg-teal-700 text-white' : 'text-teal-100'
                  }`}
                >
                  <item.icon size={24} className="mr-4" />
                  {item.label}
                </button>
              ))}
              <button onClick={onLogout} className="flex items-center w-full px-4 py-4 rounded-xl text-lg text-teal-100 mt-8 border-t border-teal-800">
                  <LogOut size={24} className="mr-4" /> Logout
              </button>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 scroll-smooth">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
             {/* Context Banner */}
             <div className="mb-6 flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-slate-200 no-print">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">Context:</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${currentBranchId === 'HEAD_OFFICE' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'}`}>
                    {activeBranchName}
                  </span>
                  {!isSuperAdmin && <Lock size={12} className="text-slate-400" />}
                </div>
                <div className="text-xs text-slate-400">
                   User: {currentUser?.username}
                </div>
             </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
