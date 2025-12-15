
import React, { useState } from 'react';
import {
  Plus,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Building,
  RefreshCcw,
  Edit,
  Power,
  Save,
  X,
  Trash2
} from 'lucide-react';
import { Branch, Staff } from '../types';
import { useNotifications } from './NotificationContext';
import { api } from '../services/api';

interface BranchesProps {
    branches: Branch[];
    onUpdateBranches: (branches: Branch[]) => void;
    onAddBranch?: (branch: Branch) => Promise<void>;
    staff?: Staff[];
    currentUser?: Staff;
}

const Branches: React.FC<BranchesProps> = ({ branches, onUpdateBranches, onAddBranch, staff = [], currentUser }) => {
  const { showSuccess, showError } = useNotifications();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // State for editing
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<Partial<Branch>>({});
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  // Stats
  const displayBranches = branches.filter(b => b.id !== 'HEAD_OFFICE');
  const activeBranches = displayBranches.filter(b => b.status === 'ACTIVE').length;
  const totalStaff = staff.length;

  const handleEditClick = (branch: Branch) => {
    setCurrentBranch(branch);
    setFormData(branch);
    setShowEditModal(true);
  };

  const handleToggleStatus = async (id: string) => {
    const branch = branches.find(b => b.id === id);
    if (!branch) return;

    const newStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      await api.request(`/branches/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      // Update local state after successful API call
      const updatedBranches = branches.map(b => {
        if (b.id === id) {
          return { ...b, status: newStatus } as Branch;
        }
        return b;
      });
      onUpdateBranches(updatedBranches);

      const action = newStatus === 'ACTIVE' ? 'activated' : 'deactivated';
      showSuccess('Status Updated', `${branch.name} has been ${action}.`);
    } catch (error: any) {
      console.error('Failed to update branch status:', error);
      showError('Update Failed', error.message || 'There was an error updating the branch status. Please try again.');
    }
  };

  const handleSaveEdit = async () => {
    if (!currentBranch || !formData.name || !formData.location) {
      showError('Missing Information', 'Please fill in branch name and location.');
      return;
    }

    try {
      await api.request(`/branches/${currentBranch.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          manager: formData.manager || currentBranch.manager
        })
      });

      // Update local state after successful API call
      const updatedBranches = branches.map(b =>
        b.id === currentBranch.id ? { ...b, ...formData } as Branch : b
      );
      onUpdateBranches(updatedBranches);
      showSuccess('Branch Updated', `${formData.name} has been successfully updated.`);
      setShowEditModal(false);
      setCurrentBranch(null);
    } catch (error: any) {
      console.error('Failed to update branch:', error);
      showError('Update Failed', error.message || 'There was an error updating the branch. Please try again.');
    }
  };

  const handleAddBranch = async () => {
     if (!formData.name || !formData.location) {
        showError('Missing Information', 'Please fill in branch name and location.');
        return;
     }

     const newId = `BR${String(branches.length + 1).padStart(3, '0')}`;
     const newBranch: Branch = {
         id: newId,
         name: formData.name,
         location: formData.location,
         manager: formData.manager || 'Unassigned',
         status: 'ACTIVE'
     };

     try {
        if (onAddBranch) {
           await onAddBranch(newBranch);
           showSuccess('Branch Created', `${newBranch.name} has been successfully added.`);
        } else {
           // Fallback to local update if no API handler
           onUpdateBranches([...branches, newBranch]);
           showSuccess('Branch Created', `${newBranch.name} has been added locally.`);
        }
        setShowAddModal(false);
        setFormData({});
     } catch (error) {
        showError('Failed to Create Branch', 'There was an error saving the branch. Please try again.');
     }
  };

  const handleDeleteBranch = async () => {
     if (!branchToDelete) return;

     try {
        await api.request(`/branches/${branchToDelete.id}`, {
           method: 'DELETE'
        });

        // Remove from local state
        const updatedBranches = branches.filter(b => b.id !== branchToDelete.id);
        onUpdateBranches(updatedBranches);

        showSuccess('Branch Deleted', `${branchToDelete.name} has been permanently deleted.`);
        setShowDeleteModal(false);
        setBranchToDelete(null);
     } catch (error: any) {
        console.error('Failed to delete branch:', error);
        showError('Delete Failed', error.message || 'There was an error deleting the branch. Please try again.');
     }
  };

  const handleDeleteClick = (branch: Branch) => {
     setBranchToDelete(branch);
     setShowDeleteModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Branch Management</h2>
          <p className="text-slate-500 mt-1">Configure locations, managers, and operational status.</p>
        </div>
        <button 
          onClick={() => { setFormData({}); setShowAddModal(true); }}
          className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold shadow-lg shadow-teal-600/20 transition-all"
        >
          <Plus size={20} /> Add New Branch
        </button>
      </div>

      {/* Branch Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="p-4 rounded-full bg-teal-50 text-teal-600">
             <Building size={24} />
           </div>
           <div>
             <h3 className="text-2xl font-bold text-slate-900">{displayBranches.length}</h3>
             <p className="text-sm text-slate-500">Total Locations</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="p-4 rounded-full bg-emerald-50 text-emerald-600">
             <CheckCircle size={24} />
           </div>
           <div>
             <h3 className="text-2xl font-bold text-slate-900">{activeBranches}</h3>
             <p className="text-sm text-slate-500">Operational</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="p-4 rounded-full bg-blue-50 text-blue-600">
             <Users size={24} />
           </div>
           <div>
             <h3 className="text-2xl font-bold text-slate-900">{totalStaff}</h3>
             <p className="text-sm text-slate-500">Total Staff</p>
           </div>
        </div>
      </div>

      {/* Branch List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
           <h3 className="font-bold text-slate-800 text-lg">All Branches</h3>
           <button className="text-slate-500 hover:text-teal-600 flex items-center gap-1 text-sm">
             <RefreshCcw size={14} /> Refresh Status
           </button>
        </div>
        <table className="w-full text-left">
           <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Branch Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Manager</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Sync</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {displayBranches.map((branch) => (
                <tr key={branch.id} className="hover:bg-slate-50">
                   <td className="px-6 py-4">
                     <div className="font-bold text-slate-800">{branch.name}</div>
                     <div className="text-xs text-slate-400">ID: {branch.id}</div>
                   </td>
                   <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-2">
                     <MapPin size={14} className="text-slate-400" />
                     {branch.location}
                   </td>
                   <td className="px-6 py-4 text-sm font-medium text-slate-700">
                     {branch.manager}
                   </td>
                   <td className="px-6 py-4">
                      {branch.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                           <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                           <XCircle size={12} /> Inactive
                        </span>
                      )}
                   </td>
                   <td className="px-6 py-4 text-xs text-slate-500">
                     2 mins ago
                   </td>
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(branch)}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors"
                          title="Edit Details"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(branch.id)}
                          className={`p-2 bg-white border border-slate-200 rounded-lg transition-colors ${
                              branch.status === 'ACTIVE'
                              ? 'text-rose-500 hover:bg-rose-50 hover:border-rose-200'
                              : 'text-emerald-500 hover:bg-emerald-50 hover:border-emerald-200'
                          }`}
                          title={branch.status === 'ACTIVE' ? "Deactivate Branch" : "Activate Branch"}
                        >
                          <Power size={16} />
                        </button>
                        {currentUser?.role === 'SUPER_ADMIN' && branch.id !== 'HEAD_OFFICE' && (
                          <button
                            onClick={() => handleDeleteClick(branch)}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                            title="Delete Branch"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                   </td>
                </tr>
              ))}
           </tbody>
        </table>
      </div>

      {/* Add/Edit Branch Modal */}
      {(showAddModal || showEditModal) && (
         <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{showEditModal ? 'Edit Branch' : 'Add New Branch'}</h3>
                    <p className="text-slate-500 text-sm">{showEditModal ? `Update details for ${currentBranch?.name}` : 'Create a new location'}</p>
                  </div>
                  <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                      placeholder="e.g. Arusha City Center"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location / Address</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                      placeholder="Street, District, Region"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Assign Manager</label>
                    <select 
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      value={formData.manager || ''}
                      onChange={(e) => setFormData({...formData, manager: e.target.value})}
                    >
                       <option value="">Select Staff Member</option>
                       {staff.map(s => (
                           <option key={s.id} value={s.name}>{s.name} ({s.role.replace('_', ' ')})</option>
                       ))}
                    </select>
                  </div>
               </div>
               <div className="p-6 bg-slate-50 flex justify-end gap-3">
                  <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Cancel</button>
                  <button 
                    onClick={showEditModal ? handleSaveEdit : handleAddBranch} 
                    className="px-4 py-2 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-lg shadow-sm flex items-center gap-2"
                  >
                    <Save size={18} /> {showEditModal ? 'Save Changes' : 'Create Branch'}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && branchToDelete && (
         <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Delete Branch</h3>
                    <p className="text-slate-500 text-sm">This action cannot be undone</p>
                  </div>
                  <button onClick={() => { setShowDeleteModal(false); setBranchToDelete(null); }} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
               </div>
               <div className="p-6 space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Trash2 size={14} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-red-900 mb-1">Confirm Branch Deletion</h4>
                        <p className="text-red-700 text-sm">
                          Are you sure you want to permanently delete <strong>{branchToDelete.name}</strong>?
                          This will remove all associated data and cannot be reversed.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-amber-800 text-sm">
                      <strong>Requirements:</strong> Branch must have no active staff and no inventory before deletion.
                    </p>
                  </div>
               </div>
               <div className="p-6 bg-slate-50 flex justify-end gap-3">
                  <button
                    onClick={() => { setShowDeleteModal(false); setBranchToDelete(null); }}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteBranch}
                    className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg shadow-sm flex items-center gap-2"
                  >
                    <Trash2 size={18} /> Delete Branch
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Branches;
