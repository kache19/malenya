import React, { useEffect, useState } from "react";
import {
  Archive,
  RefreshCcw,
  Shield,
  CheckCircle,
  FileText,
  DollarSign,
  Search,
  RotateCcw
} from "lucide-react";
import { api } from "../services/api";
import type { Branch, Invoice, Expense } from "../types";

interface ArchiveProps {
  currentBranchId: string;
  invoices: Invoice[];
  expenses: Expense[];
  onRestore: (type: 'invoice' | 'expense', id: string) => void;
  onAutoArchive: (months: number) => void;
}

const ArchiveManager: React.FC<ArchiveProps> = ({ 
  currentBranchId, 
  invoices = [], 
  expenses = [], 
  onRestore, 
  onAutoArchive 
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoArchiveMonth, setAutoArchiveMonth] = useState(3);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const b = await api.getBranches();
        if (mounted) setBranches(b || []);
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const isHeadOffice = currentBranchId === 'HEAD_OFFICE';

  // Filter Logic: Only show ARCHIVED items
  const archivedInvoices = (invoices || []).filter(i => {
      const isArchived = i.archived === true;
      const matchBranch = isHeadOffice ? true : i.branchId === currentBranchId;
      const matchSearch = (i.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (i.id?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      return isArchived && matchBranch && matchSearch;
  });

  const archivedExpenses = (expenses || []).filter(e => {
      const isArchived = e.archived === true;
      const matchBranch = isHeadOffice ? true : e.branchId === currentBranchId;
      const matchSearch = (e.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (e.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      return isArchived && matchBranch && matchSearch;
  });

  const handleAutoArchive = async () => {
    setIsLoading(true);
    try {
      await onAutoArchive(autoArchiveMonth);
    } catch (error) {
      console.error('Error running auto-archive:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Archive & History</h2>
          <p className="text-slate-500 mt-1">Manage and restore old financial records.</p>
        </div>
        
        {/* Auto Archive Control */}
        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl">
            <span className="text-xs font-bold text-slate-500 pl-2">Auto-Archive:</span>
            <select 
                className="text-sm bg-white border border-slate-200 rounded-lg py-1 px-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={autoArchiveMonth}
                onChange={(e) => setAutoArchiveMonth(parseInt(e.target.value))}
                disabled={isLoading}
            >
                <option value={3}>Older than 3 Months</option>
                <option value={6}>Older than 6 Months</option>
                <option value={12}>Older than 1 Year</option>
            </select>
            <button 
                onClick={handleAutoArchive}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold text-xs shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Archive size={14} /> {isLoading ? 'Running...' : 'Run Now'}
            </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
              <button 
                  onClick={() => setActiveTab('invoices')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'invoices' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <FileText size={16} /> Invoices
                  {archivedInvoices.length > 0 && <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">{archivedInvoices.length}</span>}
              </button>
              <button 
                  onClick={() => setActiveTab('expenses')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'expenses' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <DollarSign size={16} /> Expenses
                  {archivedExpenses.length > 0 && <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">{archivedExpenses.length}</span>}
              </button>
          </div>

          <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search archive..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* INVOICES TABLE */}
          {activeTab === 'invoices' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {archivedInvoices.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                          <Archive size={48} className="mx-auto mb-4 opacity-20" />
                          <p className="font-medium">No archived invoices found.</p>
                      </div>
                  ) : (
                      <div className="overflow-x-auto">
                          <table className="w-full text-left">
                              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                  <tr>
                                      <th className="px-6 py-4">Invoice ID</th>
                                      <th className="px-6 py-4">Date</th>
                                      <th className="px-6 py-4">Customer</th>
                                      <th className="px-6 py-4">Amount</th>
                                      <th className="px-6 py-4">Status</th>
                                      <th className="px-6 py-4 text-center">Action</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {archivedInvoices.map((inv) => (
                                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-6 py-4 font-mono text-sm text-slate-600">{inv.id}</td>
                                          <td className="px-6 py-4 text-sm text-slate-500">
                                              {inv.dateIssued ? new Date(inv.dateIssued).toLocaleDateString() : 'N/A'}
                                          </td>
                                          <td className="px-6 py-4 font-medium text-slate-800">{inv.customerName || 'Unknown'}</td>
                                          <td className="px-6 py-4 font-bold text-slate-700">
                                              {typeof inv.totalAmount === 'number' ? inv.totalAmount.toLocaleString() : '0'} TZS
                                          </td>
                                          <td className="px-6 py-4">
                                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">
                                                  <CheckCircle size={12} /> Archived
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              <button 
                                                onClick={() => {
                                                  if (window.confirm(`Restore invoice ${inv.id}?`)) {
                                                    onRestore('invoice', inv.id);
                                                  }
                                                }}
                                                className="text-teal-600 hover:text-teal-800 hover:bg-teal-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 mx-auto"
                                              >
                                                  <RotateCcw size={14} /> Restore
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>
          )}

          {/* EXPENSES TABLE */}
          {activeTab === 'expenses' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {archivedExpenses.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                          <Archive size={48} className="mx-auto mb-4 opacity-20" />
                          <p className="font-medium">No archived expenses found.</p>
                      </div>
                  ) : (
                      <div className="overflow-x-auto">
                          <table className="w-full text-left">
                              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                  <tr>
                                      <th className="px-6 py-4">Date</th>
                                      <th className="px-6 py-4">Category</th>
                                      <th className="px-6 py-4">Description</th>
                                      <th className="px-6 py-4">Amount</th>
                                      <th className="px-6 py-4">Branch</th>
                                      <th className="px-6 py-4 text-center">Action</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {archivedExpenses.map((exp) => (
                                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-6 py-4 text-sm text-slate-500">
                                              {exp.date ? new Date(exp.date).toLocaleDateString() : 'N/A'}
                                          </td>
                                          <td className="px-6 py-4 text-sm font-medium text-slate-700">{exp.category || 'N/A'}</td>
                                          <td className="px-6 py-4 text-sm text-slate-600">{exp.description || 'N/A'}</td>
                                          <td className="px-6 py-4 font-bold text-slate-700">
                                              {typeof exp.amount === 'number' ? exp.amount.toLocaleString() : '0'} TZS
                                          </td>
                                          <td className="px-6 py-4 text-xs text-slate-500">
                                              {branches.find(b => b.id === exp.branchId)?.name || 'Unknown'}
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              <button 
                                                onClick={() => {
                                                  if (window.confirm(`Restore expense ${exp.id}?`)) {
                                                    onRestore('expense', exp.id);
                                                  }
                                                }}
                                                className="text-teal-600 hover:text-teal-800 hover:bg-teal-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 mx-auto"
                                              >
                                                  <RotateCcw size={14} /> Restore
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
};

export default ArchiveManager;