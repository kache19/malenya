
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  MapPin,
  Shield,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  User,
  Edit,
  ArrowRightLeft,
  Save,
  Lock,
  Eye,
  EyeOff,
  Filter,
  Download,
  Upload,
  Activity,
  TrendingUp,
  Calendar,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  CheckSquare,
  Square,
  FileText,
  BarChart3
} from 'lucide-react';
import { Staff as StaffType, UserRole, Branch, AuditLog } from '../types';
import { api } from '../services/api';
import { useNotifications } from './NotificationContext';

interface StaffProps {
    currentBranchId: string;
    branches: Branch[];
    staffList?: StaffType[];
    onAddStaff?: (staff: StaffType) => void;
    onUpdateStaff?: (staff: StaffType) => void;
}

const Staff: React.FC<StaffProps> = ({ currentBranchId, branches, staffList: propStaffList = [], onAddStaff, onUpdateStaff }) => {
  const { showSuccess, showError } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [staffList, setStaffList] = useState<StaffType[]>(propStaffList);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<UserRole | null>(null);

  // Duplicate checking helpers
  const checkEmailDuplicate = (email: string, excludeId?: string) => {
    return staffList.some(staff =>
      (!excludeId || staff.id !== excludeId) &&
      staff.email.toLowerCase() === email.toLowerCase()
    );
  };

  const checkUsernameDuplicate = (username: string, excludeId?: string) => {
    return staffList.some(staff =>
      (!excludeId || staff.id !== excludeId) &&
      staff.username.toLowerCase() === username.toLowerCase()
    );
  };

  // Filter States
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<{start: string, end: string}>({start: '', end: ''});

  // Sorting States
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'status' | 'joinedDate' | 'lastLogin'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Bulk Operations States
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'status' | 'transfer' | 'role' | null>(null);
  const [bulkStatusValue, setBulkStatusValue] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [bulkTransferBranch, setBulkTransferBranch] = useState<string>('');
  const [bulkRoleValue, setBulkRoleValue] = useState<UserRole>(UserRole.CASHIER);

  // Analytics States
  const [staffActivity, setStaffActivity] = useState<AuditLog[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Form States
  const [newStaff, setNewStaff] = useState<Partial<StaffType>>({
    name: '',
    role: UserRole.CASHIER,
    branchId: currentBranchId === 'HEAD_OFFICE' ? '' : currentBranchId,
    email: '',
    phone: '',
    status: 'ACTIVE',
    username: '',
    password: ''
  });

  const [editingStaff, setEditingStaff] = useState<StaffType | null>(null);

  const isHeadOffice = currentBranchId === 'HEAD_OFFICE';
  const branchName = branches.find(b => b.id === currentBranchId)?.name;

  // Load staff data from API on mount
  React.useEffect(() => {
    const loadStaffData = async () => {
      setIsLoading(true);
      try {
        const staffData = await api.getStaff();
        setStaffList(staffData || []);
      } catch (error) {
        console.error('Failed to load staff data:', error);
        // Keep prop data as fallback
        setStaffList(propStaffList);
      } finally {
        setIsLoading(false);
      }
    };

    loadStaffData();
  }, [currentBranchId]); // Reload when branch changes

  // Optional: Auto-select first branch when branches load (commented out to keep branch optional)
  // useEffect(() => {
  //   if (isHeadOffice && branches.length > 0) {
  //     const defaultBranch = branches.find(b => b.id !== 'HEAD_OFFICE');
  //     if (defaultBranch && (!newStaff.branchId || newStaff.branchId === '')) {
  //       setNewStaff(prev => ({ ...prev, branchId: defaultBranch.id }));
  //     }
  //   }
  // }, [branches, isHeadOffice, newStaff.branchId]);

  // Enhanced Filter and Sort Logic
  const filteredAndSortedStaff = useMemo(() => {
    let filtered = staffList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.username.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = isHeadOffice ? true : s.branchId === currentBranchId;
      const matchesRoleFilter = roleFilter === 'ALL' || s.role === roleFilter;
      const matchesStatusFilter = statusFilter === 'ALL' || s.status === statusFilter;
      const matchesBranchFilter = branchFilter === 'ALL' || s.branchId === branchFilter;

      // Date range filter
      let matchesDateRange = true;
      if (dateRangeFilter.start && dateRangeFilter.end && s.joinedDate) {
        const joinedDate = new Date(s.joinedDate);
        const startDate = new Date(dateRangeFilter.start);
        const endDate = new Date(dateRangeFilter.end);
        matchesDateRange = joinedDate >= startDate && joinedDate <= endDate;
      }

      return matchesSearch && matchesBranch && matchesRoleFilter &&
             matchesStatusFilter && matchesBranchFilter && matchesDateRange;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'joinedDate':
          aValue = new Date(a.joinedDate || '1970-01-01');
          bValue = new Date(b.joinedDate || '1970-01-01');
          break;
        case 'lastLogin':
          aValue = new Date(a.lastLogin || '1970-01-01');
          bValue = new Date(b.lastLogin || '1970-01-01');
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [staffList, searchTerm, roleFilter, statusFilter, branchFilter, dateRangeFilter, sortBy, sortOrder, isHeadOffice, currentBranchId]);

  const handleAddStaff = async () => {
    if(!newStaff.name || !newStaff.email || !newStaff.username || !newStaff.password) {
        showError('Missing Information', 'Please fill in all required fields.');
        return;
    }

    if(newStaff.password!.length < 6) {
        showError('Invalid Password', 'Password must be at least 6 characters long.');
        return;
    }

    try {
      const staffData: Partial<StaffType> = {
        id: `ST-${Date.now()}`,
        name: newStaff.name!,
        role: newStaff.role as UserRole,
        branchId: newStaff.branchId || undefined,
        email: newStaff.email!,
        phone: newStaff.phone || '',
        status: 'ACTIVE',
        username: newStaff.username!,
        password: newStaff.password!
      };

      const createdStaff = await api.createStaff(staffData);
      setStaffList(prev => [createdStaff, ...prev]);

      if (onAddStaff) {
        onAddStaff(createdStaff);
      }

      showSuccess('Staff Member Added', `${createdStaff.name} has been successfully added to the database.`);
      setShowAddModal(false);
      setNewStaff({
        name: '',
        role: UserRole.CASHIER,
        branchId: currentBranchId === 'HEAD_OFFICE' ? '' : currentBranchId,
        email: '',
        phone: '',
        status: 'ACTIVE',
        username: '',
        password: ''
      });
    } catch (error) {
      console.error('Failed to create staff:', error);
      showError('Failed to Add Staff', 'There was an error saving the staff member to the database. Please try again.');
    }
  };

  const handleUpdateStaff = async () => {
      if (!editingStaff) return;

      try {
        const updatedStaff = await api.updateStaff(editingStaff.id, editingStaff);
        setStaffList(prev => prev.map(s => s.id === editingStaff.id ? updatedStaff : s));

        if (onUpdateStaff) {
          onUpdateStaff(updatedStaff);
        }

        // Check if branch was changed (transfer)
        const originalStaff = staffList.find(s => s.id === editingStaff.id);
        if (originalStaff && originalStaff.branchId !== editingStaff.branchId) {
            const oldBranchName = branches.find(b => b.id === originalStaff.branchId)?.name || 'Unknown';
            const newBranchName = branches.find(b => b.id === editingStaff.branchId)?.name || 'Unknown';
            showSuccess('Staff Transferred', `${editingStaff.name} has been successfully transferred from ${oldBranchName} to ${newBranchName}.`);
        } else {
            showSuccess('Staff Updated', `${editingStaff.name}'s information has been successfully updated in the database.`);
        }

        setShowEditModal(false);
        setEditingStaff(null);
      } catch (error) {
        console.error('Failed to update staff:', error);
        showError('Update Failed', 'Failed to update staff member in the database. Please try again.');
      }
    };

  const openEditModal = (staffMember: StaffType) => {
      setEditingStaff({ ...staffMember });
      setShowEditModal(true);
  };

  const toggleStatus = async (id: string) => {
        const staffMember = staffList.find(s => s.id === id);
        if (!staffMember) return;

        const newStatus = staffMember.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

        try {
          const updatedStaff = await api.updateStaff(id, { status: newStatus });
          setStaffList(prev => prev.map(s => s.id === id ? updatedStaff : s));

          if (onUpdateStaff) {
            onUpdateStaff(updatedStaff);
          }

          const action = newStatus === 'ACTIVE' ? 'activated' : 'deactivated';
          showSuccess('Status Updated', `${staffMember.name} has been ${action} in the database.`);
        } catch (error) {
          console.error('Failed to update staff status:', error);
          showError('Update Failed', 'Failed to update staff status in the database. Please try again.');
        }
    };

  const getRoleBadgeColor = (role: UserRole) => {
      switch(role) {
          case UserRole.SUPER_ADMIN: return 'bg-purple-100 text-purple-700';
          case UserRole.BRANCH_MANAGER: return 'bg-blue-100 text-blue-700';
          case UserRole.PHARMACIST: return 'bg-teal-100 text-teal-700';
          case UserRole.ACCOUNTANT: return 'bg-amber-100 text-amber-700';
          default: return 'bg-slate-100 text-slate-700';
      }
  };

  const generateUsername = (name: string) => {
    if(!name) return '';
    return name.toLowerCase().replace(/\s+/g, '').slice(0, 8) + Math.floor(Math.random() * 100);
  };

  // Bulk Operations Functions
  const handleSelectAll = () => {
    if (selectedStaff.size === filteredAndSortedStaff.length) {
      setSelectedStaff(new Set());
    } else {
      setSelectedStaff(new Set(filteredAndSortedStaff.map(s => s.id)));
    }
  };

  const handleSelectStaff = (staffId: string) => {
    const newSelected = new Set(selectedStaff);
    if (newSelected.has(staffId)) {
      newSelected.delete(staffId);
    } else {
      newSelected.add(staffId);
    }
    setSelectedStaff(newSelected);
  };

  const handleBulkAction = async () => {
    if (!onUpdateStaff || selectedStaff.size === 0) return;

    try {
      const updates: StaffType[] = [];

      for (const staffId of selectedStaff) {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) continue;

        let updatedStaff = { ...staff };

        switch (bulkAction) {
          case 'status':
            updatedStaff.status = bulkStatusValue;
            break;
          case 'transfer':
            updatedStaff.branchId = bulkTransferBranch;
            break;
          case 'role':
            updatedStaff.role = bulkRoleValue;
            break;
        }

        updates.push(updatedStaff);
      }

      // Update all staff members
      for (const staff of updates) {
        await onUpdateStaff(staff);
      }

      const actionText = bulkAction === 'status' ? `status to ${bulkStatusValue}` :
                        bulkAction === 'transfer' ? 'transferred' : `role to ${bulkRoleValue}`;
      showSuccess('Bulk Update Completed', `${selectedStaff.size} staff members ${actionText} successfully.`);

      setSelectedStaff(new Set());
      setShowBulkModal(false);
      setBulkAction(null);
    } catch (error) {
      showError('Bulk Update Failed', 'Some updates failed. Please try again.');
    }
  };

  // Analytics Functions
  const loadStaffAnalytics = async (staffId: string) => {
    setAnalyticsLoading(true);
    try {
      // This would typically fetch from an API endpoint
      // For now, we'll simulate with mock data
      const mockActivity: AuditLog[] = [
        {
          id: 1,
          userId: staffId,
          userName: staffList.find(s => s.id === staffId)?.name || 'Unknown',
          action: 'LOGIN',
          entityType: 'AUTH',
          timestamp: new Date().toISOString(),
          severity: 'INFO'
        },
        {
          id: 2,
          userId: staffId,
          userName: staffList.find(s => s.id === staffId)?.name || 'Unknown',
          action: 'SALE_CREATED',
          entityType: 'SALE',
          entityId: 'SALE-001',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          severity: 'INFO'
        }
      ];
      setStaffActivity(mockActivity);
    } catch (error) {
      showError('Failed to Load Analytics', 'Could not load staff activity data.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Export Functions
  const exportToCSV = () => {
    const headers = ['Name', 'Username', 'Email', 'Phone', 'Role', 'Branch', 'Status', 'Joined Date', 'Last Login'];
    const csvData = filteredAndSortedStaff.map(staff => [
      staff.name,
      staff.username,
      staff.email,
      staff.phone,
      staff.role.replace('_', ' '),
      staff.branchId ? branches.find(b => b.id === staff.branchId)?.name || 'Unknown' : 'No Branch',
      staff.status,
      staff.joinedDate || '',
      staff.lastLogin || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `staff_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('Export Completed', 'Staff data exported successfully.');
    setShowExportModal(false);
  };

  // Sorting Functions
  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Clear Filters
  const clearFilters = () => {
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setBranchFilter('ALL');
    setDateRangeFilter({start: '', end: ''});
    setSearchTerm('');
  };

  // Role Permissions Data
  const getRolePermissions = (role: UserRole) => {
    const permissions = {
      [UserRole.SUPER_ADMIN]: {
        description: 'Full system access with all administrative privileges',
        permissions: [
          'Manage all users and roles',
          'Access all branches and data',
          'Configure system settings',
          'View all financial reports',
          'Approve high-value transactions',
          'System backup and restore',
          'Delete any record',
          'Override any restriction'
        ]
      },
      [UserRole.BRANCH_MANAGER]: {
        description: 'Manage branch operations and staff',
        permissions: [
          'Manage branch staff (add/edit/deactivate)',
          'View branch financial reports',
          'Approve branch expenses up to limit',
          'Manage branch inventory',
          'View branch sales data',
          'Generate branch reports',
          'Transfer staff within branch network'
        ]
      },
      [UserRole.PHARMACIST]: {
        description: 'Handle pharmaceutical operations and prescriptions',
        permissions: [
          'Manage prescriptions',
          'Dispense medications',
          'Access patient records',
          'Manage inventory (pharmaceuticals)',
          'Process returns and refunds',
          'Generate prescription reports',
          'Verify medication interactions'
        ]
      },
      [UserRole.ACCOUNTANT]: {
        description: 'Handle financial operations and reporting',
        permissions: [
          'View financial reports',
          'Process payments and invoices',
          'Manage expenses and budgets',
          'Generate financial statements',
          'Reconcile accounts',
          'Tax reporting preparation',
          'Audit financial transactions'
        ]
      },
      [UserRole.INVENTORY_CONTROLLER]: {
        description: 'Manage inventory and stock operations',
        permissions: [
          'Manage product inventory',
          'Process stock transfers',
          'Handle stock requisitions',
          'Manage disposal requests',
          'Generate inventory reports',
          'Set reorder levels',
          'Approve stock movements'
        ]
      },
      [UserRole.AUDITOR]: {
        description: 'Monitor and audit system activities',
        permissions: [
          'View all audit logs',
          'Generate compliance reports',
          'Monitor system activity',
          'Review transaction history',
          'Access read-only financial data',
          'Generate audit reports',
          'Flag suspicious activities'
        ]
      },
      [UserRole.CASHIER]: {
        description: 'Handle point-of-sale operations',
        permissions: [
          'Process sales transactions',
          'Handle customer payments',
          'Issue receipts and invoices',
          'View product pricing',
          'Process returns (with approval)',
          'View basic inventory levels',
          'Generate daily sales reports'
        ]
      }
    };
    return permissions[role] || { description: 'No permissions defined', permissions: [] };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Staff Management</h2>
          <p className="text-slate-500 mt-1">
             {isHeadOffice
                ? 'Manage all employees across every branch.'
                : `Managing team members at ${branchName}.`
             }
          </p>
        </div>
        <div className="flex gap-3">
          {selectedStaff.size > 0 && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-bold shadow-lg shadow-amber-600/20 transition-all"
            >
              <MoreHorizontal size={20} /> Bulk Actions ({selectedStaff.size})
            </button>
          )}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-700 font-bold shadow-lg shadow-slate-600/20 transition-all"
          >
            <Download size={20} /> Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold shadow-lg shadow-teal-600/20 transition-all"
          >
            <UserPlus size={20} /> Add New Staff
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
        {/* Search and Primary Actions */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search staff by name, email, or username..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                showFilters
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={18} />
              Filters
            </button>
            {selectedStaff.size > 0 && (
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                {selectedStaff.size === filteredAndSortedStaff.length ? <Square size={18} /> : <CheckSquare size={18} />}
                {selectedStaff.size === filteredAndSortedStaff.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t border-slate-100 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="ALL">All Roles</option>
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{role.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {/* Branch Filter */}
              {isHeadOffice && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range Filter */}
              <div className={isHeadOffice ? '' : 'md:col-span-2'}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Joined Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRangeFilter.start}
                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                    className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                  />
                  <input
                    type="date"
                    value={dateRangeFilter.end}
                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                    className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-slate-500">
                Showing {filteredAndSortedStaff.length} of {staffList.length} staff members
              </div>
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Sorting Options */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <span className="text-sm font-medium text-slate-700 mr-2">Sort by:</span>
          {[
            { key: 'name', label: 'Name' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status' },
            { key: 'joinedDate', label: 'Joined Date' },
            { key: 'lastLogin', label: 'Last Login' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key as typeof sortBy)}
              className={`flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-colors ${
                sortBy === key
                  ? 'bg-teal-100 text-teal-700 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
              {sortBy === key && (
                sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedStaff.map(member => (
               <div key={member.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-all group ${
                 selectedStaff.has(member.id) ? 'border-teal-300 bg-teal-50/30' : 'border-slate-100'
               }`}>
                   <div className="p-6">
                       <div className="flex justify-between items-start mb-4">
                           <div className="flex items-center gap-4">
                             {/* Bulk Selection Checkbox */}
                             <div className="flex items-center">
                               <input
                                 type="checkbox"
                                 checked={selectedStaff.has(member.id)}
                                 onChange={() => handleSelectStaff(member.id)}
                                 className="w-4 h-4 text-teal-600 bg-slate-100 border-slate-300 rounded focus:ring-teal-500 focus:ring-2"
                               />
                             </div>
                             <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xl">
                                 {member.name.charAt(0)}
                             </div>
                             <div>
                                 <h3 className="font-bold text-slate-900">{member.name}</h3>
                                 <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide mt-1 ${getRoleBadgeColor(member.role)}`}>
                                     {member.role.replace('_', ' ')}
                                 </span>
                             </div>
                           </div>
                           <div className="flex gap-2">
                             {/* Analytics Button */}
                             <button
                               onClick={() => {
                                 loadStaffAnalytics(member.id);
                                 setShowAnalyticsModal(true);
                               }}
                               className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                               title="View Analytics"
                             >
                                 <BarChart3 size={18} />
                             </button>
                             {isHeadOffice && (
                                 <button
                                   onClick={() => openEditModal(member)}
                                   className="text-slate-400 hover:text-teal-600 hover:bg-teal-50 p-2 rounded-full transition-colors"
                                   title="Edit & Transfer"
                                 >
                                     <Edit size={18} />
                                 </button>
                             )}
                           </div>
                       </div>

                      <div className="space-y-3 text-sm text-slate-600">
                          <div className="flex items-center gap-3">
                              <User size={16} className="text-slate-400" />
                              <span className="truncate text-slate-500">@{member.username}</span>
                          </div>
                          <div className="flex items-center gap-3">
                              <Mail size={16} className="text-slate-400" />
                              <span className="truncate">{member.email}</span>
                          </div>
                          <div className="flex items-center gap-3">
                              <Phone size={16} className="text-slate-400" />
                              <span>{member.phone || 'No Phone'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                              <MapPin size={16} className="text-slate-400" />
                              <span className="text-teal-700 font-medium">
                                  {member.branchId ? (branches.find(b => b.id === member.branchId)?.name || 'Unknown Branch') : 'No Branch Assigned'}
                              </span>
                          </div>
                      </div>
                  </div>
                  
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs">
                          {member.status === 'ACTIVE' ? (
                              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                  <CheckCircle size={14} /> Active
                              </span>
                          ) : (
                              <span className="flex items-center gap-1 text-slate-400 font-bold">
                                  <XCircle size={14} /> Inactive
                              </span>
                          )}
                          <span className="text-slate-400 mx-2">|</span>
                          <span className="text-slate-500">Joined: {member.joinedDate}</span>
                      </div>
                      <button 
                        onClick={() => toggleStatus(member.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                            member.status === 'ACTIVE' 
                            ? 'border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                            : 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700'
                        }`}
                      >
                          {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                  </div>
              </div>
          ))}
      </div>
      
      {filteredAndSortedStaff.length === 0 && (
          <div className="text-center py-12 text-slate-400">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>No staff members found matching your criteria.</p>
          </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
         <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
               <div className="p-6 border-b border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900">Add Team Member</h3>
                  <p className="text-slate-500 text-sm">Create a new account & credentials for an employee.</p>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                        <User size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input 
                            type="text" 
                            className="w-full pl-9 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                            placeholder="John Doe" 
                            value={newStaff.name}
                            onChange={(e) => {
                                setNewStaff({
                                    ...newStaff, 
                                    name: e.target.value,
                                    username: generateUsername(e.target.value)
                                })
                            }}
                        />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                          Role
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoleForPermissions(newStaff.role);
                              setShowPermissionsModal(true);
                            }}
                            className="text-slate-400 hover:text-teal-600 p-1"
                            title="View role permissions"
                          >
                            <Shield size={14} />
                          </button>
                        </label>
                        <div className="relative">
                            <Shield size={16} className="absolute left-3 top-3 text-slate-400" />
                            <select
                                className="w-full pl-9 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none"
                                value={newStaff.role}
                                onChange={(e) => setNewStaff({...newStaff, role: e.target.value as UserRole})}
                            >
                                {Object.values(UserRole).map(role => (
                                    <option key={role} value={role}>{role.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                            <select
                                className="w-full pl-9 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none disabled:bg-slate-100"
                                value={newStaff.branchId || ''}
                                disabled={!isHeadOffice}
                                onChange={(e) => setNewStaff({...newStaff, branchId: e.target.value || undefined})}
                            >
                                <option value="">No Branch Assigned</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="email"
                            className={`w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                              newStaff.email && checkEmailDuplicate(newStaff.email) ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                            }`}
                            placeholder="employee@pms.co.tz"
                            value={newStaff.email}
                            onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                        />
                    </div>
                    {newStaff.email && checkEmailDuplicate(newStaff.email) && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <XCircle size={12} /> This email address is already registered
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <div className="relative">
                        <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input 
                            type="tel" 
                            className="w-full pl-9 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                            placeholder="+255..." 
                            value={newStaff.phone}
                            onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                        />
                    </div>
                  </div>

                  <hr className="border-slate-100" />
                  
                  {/* Credentials Section */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <Lock size={16} className="text-teal-600" /> Login Credentials
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                               <input
                                 type="text"
                                 className={`w-full p-2 border rounded-lg text-sm bg-white ${
                                   newStaff.username && checkUsernameDuplicate(newStaff.username) ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                                 }`}
                                 value={newStaff.username}
                                 onChange={(e) => setNewStaff({...newStaff, username: e.target.value})}
                               />
                               {newStaff.username && checkUsernameDuplicate(newStaff.username) && (
                                 <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                                   <XCircle size={12} /> This username is already taken
                                 </p>
                               )}
                          </div>
                          <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                               <div className="relative">
                                   <input
                                     type={showPassword ? "text" : "password"}
                                     className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white pr-8"
                                     placeholder="Minimum 6 characters"
                                     value={newStaff.password}
                                     onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                                   />
                                   <button
                                     className="absolute right-2 top-2 text-slate-400 hover:text-teal-600"
                                     onClick={() => setShowPassword(!showPassword)}
                                     type="button"
                                   >
                                       {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                   </button>
                               </div>
                               {newStaff.password && newStaff.password.length < 6 && (
                                   <p className="text-xs text-rose-600 mt-1">Password must be at least 6 characters</p>
                               )}
                          </div>
                      </div>
                  </div>

               </div>
               <div className="p-6 bg-slate-50 flex justify-end gap-3">
                  <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Cancel</button>
                  <button onClick={handleAddStaff} className="px-4 py-2 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-lg shadow-sm">Create User</button>
               </div>
            </div>
         </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && editingStaff && (
         <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Edit Staff Details</h3>
                    <p className="text-slate-500 text-sm">Update role, branch assignment, or contact info.</p>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-full">
                      <Edit size={20} className="text-slate-500" />
                  </div>
               </div>
               
               <div className="p-6 space-y-4">
                   {/* Name & Contact */}
                   <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                            value={editingStaff.name}
                            onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
                        />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                             <input
                                type="email"
                                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm ${
                                  editingStaff.email && checkEmailDuplicate(editingStaff.email, editingStaff.id) ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                                }`}
                                value={editingStaff.email}
                                onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})}
                             />
                             {editingStaff.email && checkEmailDuplicate(editingStaff.email, editingStaff.id) && (
                               <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                                 <XCircle size={12} /> This email address is already registered to another staff member
                               </p>
                             )}
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Phone</label>
                             <input 
                                type="tel" 
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm" 
                                value={editingStaff.phone}
                                onChange={(e) => setEditingStaff({...editingStaff, phone: e.target.value})}
                             />
                        </div>
                   </div>

                   <hr className="border-slate-100 my-2" />
                   
                   {/* Role & Branch Transfer */}
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                               <Shield size={14} /> System Role
                               <button
                                 type="button"
                                 onClick={() => {
                                   setSelectedRoleForPermissions(editingStaff.role);
                                   setShowPermissionsModal(true);
                                 }}
                                 className="text-slate-400 hover:text-teal-600 p-1"
                                 title="View role permissions"
                               >
                                 <Shield size={12} />
                               </button>
                           </label>
                           <select
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                value={editingStaff.role}
                                onChange={(e) => setEditingStaff({...editingStaff, role: e.target.value as UserRole})}
                            >
                                {Object.values(UserRole).map(role => (
                                    <option key={role} value={role}>{role.replace('_', ' ')}</option>
                                ))}
                            </select>
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                               <ArrowRightLeft size={14} /> Branch Assignment (Transfer)
                           </label>
                           <select 
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                value={editingStaff.branchId}
                                onChange={(e) => setEditingStaff({...editingStaff, branchId: e.target.value})}
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                                ))}
                            </select>
                            {editingStaff.branchId !== staffList.find(s => s.id === editingStaff.id)?.branchId && (
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1 font-medium">
                                    <ArrowRightLeft size={12} /> Staff will be transferred upon saving.
                                </p>
                            )}
                       </div>
                   </div>

                   {/* Password Reset (Optional - Simplified) */}
                   <div className="mt-4">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Reset Password</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm" 
                            placeholder="Enter new password to reset..."
                            value={editingStaff.password || ''}
                            onChange={(e) => setEditingStaff({...editingStaff, password: e.target.value})}
                        />
                   </div>
               </div>

               <div className="p-6 bg-slate-50 flex justify-end gap-3">
                  <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Cancel</button>
                  <button onClick={handleUpdateStaff} className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-sm flex items-center gap-2">
                      <Save size={18} /> Save Changes
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Bulk Operations Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Bulk Operations</h3>
              <p className="text-slate-500 text-sm">Apply changes to {selectedStaff.size} selected staff members</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Select Operation</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="bulkAction"
                      value="status"
                      checked={bulkAction === 'status'}
                      onChange={(e) => setBulkAction(e.target.value as 'status')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <div className="font-medium text-slate-900">Change Status</div>
                      <div className="text-sm text-slate-500">Activate or deactivate selected staff</div>
                    </div>
                  </label>

                  {isHeadOffice && (
                    <>
                      <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="bulkAction"
                          value="transfer"
                          checked={bulkAction === 'transfer'}
                          onChange={(e) => setBulkAction(e.target.value as 'transfer')}
                          className="text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="font-medium text-slate-900">Transfer Branch</div>
                          <div className="text-sm text-slate-500">Move staff to different branch</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="bulkAction"
                          value="role"
                          checked={bulkAction === 'role'}
                          onChange={(e) => setBulkAction(e.target.value as 'role')}
                          className="text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="font-medium text-slate-900">Change Role</div>
                          <div className="text-sm text-slate-500">Update role assignments</div>
                        </div>
                      </label>
                    </>
                  )}
                </div>
              </div>

              {bulkAction === 'status' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">New Status</label>
                  <select
                    value={bulkStatusValue}
                    onChange={(e) => setBulkStatusValue(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}

              {bulkAction === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Target Branch</label>
                  <select
                    value={bulkTransferBranch}
                    onChange={(e) => setBulkTransferBranch(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {bulkAction === 'role' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">New Role</label>
                  <select
                    value={bulkRoleValue}
                    onChange={(e) => setBulkRoleValue(e.target.value as UserRole)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {Object.values(UserRole).map(role => (
                      <option key={role} value={role}>{role.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || (bulkAction === 'transfer' && !bulkTransferBranch)}
                className="px-4 py-2 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Staff Analytics</h3>
                <p className="text-slate-500 text-sm">Activity overview and performance metrics</p>
              </div>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6">
              {analyticsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                  <p className="text-slate-500 mt-2">Loading analytics...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Activity Feed */}
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Activity size={20} className="text-teal-600" />
                      Recent Activity
                    </h4>
                    <div className="space-y-3">
                      {staffActivity.map((activity, index) => (
                        <div key={activity.id || index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            activity.severity === 'CRITICAL' ? 'bg-red-500' :
                            activity.severity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}></div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                                <p className="text-xs text-slate-500">
                                  {activity.entityType && `${activity.entityType} • `}
                                  {new Date(activity.timestamp || '').toLocaleString()}
                                </p>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                activity.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                activity.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {activity.severity}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {staffActivity.length === 0 && (
                        <p className="text-slate-500 text-center py-4">No recent activity found</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Export Staff Data</h3>
              <p className="text-slate-500 text-sm">Download staff information as CSV file</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText size={20} className="text-teal-600" />
                    <span className="font-medium text-slate-900">CSV Export</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Export {filteredAndSortedStaff.length} staff records with all available information including contact details, roles, and branch assignments.
                  </p>
                </div>
                <div className="text-sm text-slate-500">
                  <p>• File format: CSV (Comma Separated Values)</p>
                  <p>• Includes: Name, Username, Email, Phone, Role, Branch, Status, Join Date, Last Login</p>
                  <p>• Ready for Excel, Google Sheets, or other spreadsheet applications</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">
                Cancel
              </button>
              <button onClick={exportToCSV} className="px-4 py-2 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-lg flex items-center gap-2">
                <Download size={18} />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Permissions Modal */}
      {showPermissionsModal && selectedRoleForPermissions && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Shield size={24} className="text-teal-600" />
                  {selectedRoleForPermissions.replace('_', ' ')} Permissions
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  {getRolePermissions(selectedRoleForPermissions).description}
                </p>
              </div>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Granted Permissions</h4>
                <div className="grid gap-3">
                  {getRolePermissions(selectedRoleForPermissions).permissions.map((permission, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle size={18} className="text-teal-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{permission}</span>
                    </div>
                  ))}
                </div>
                {getRolePermissions(selectedRoleForPermissions).permissions.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Shield size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No specific permissions defined for this role</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
