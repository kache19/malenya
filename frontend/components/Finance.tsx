
import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Receipt,
  FileText, Plus, X, Printer, Store, Wallet, Building, CheckCircle, FilePlus, User, Eye, Archive, XCircle, Download
} from 'lucide-react';
import { Invoice, PaymentMethod, Expense, Sale, Branch, Staff, UserRole, SystemSetting } from '../types';
import { api } from '../services/api';
import InvoiceModal from './InvoiceModal';
import ExpenseModal from './ExpenseModal';
import InvoicePreviewModal from './InvoicePreviewModal';
import PaymentModal from './PaymentModal.tsx';

const PAYMENT_METHODS_DATA = [
  { name: 'Cash', value: 4500000 },
  { name: 'M-Pesa / Tigo', value: 3500000 },
  { name: 'Insurance (NHIF/AAR)', value: 2500000 },
  { name: 'Credit', value: 500000 },
];

const COLORS = ['#0f766e', '#14b8a6', '#f59e0b', '#64748b'];

interface FinanceProps {
     currentBranchId: string;
     invoices: Invoice[];
     expenses: Expense[];
     sales: Sale[];
     onProcessPayment: (invoice: Invoice) => void;
     onCreateExpense: (expense: Expense) => void;
     onActionExpense?: (id: number, action: 'Approved' | 'Rejected') => void;
     onArchiveItem?: (type: 'invoice' | 'expense', id: string | number) => void;
     branches?: Branch[];
     currentUser?: Staff | null;
     settings?: SystemSetting[];
}

const Finance: React.FC<FinanceProps> = ({ currentBranchId, invoices: propInvoices = [], expenses: propExpenses = [], sales: propSales = [], onProcessPayment, onCreateExpense, onActionExpense, onArchiveItem, branches = [], currentUser, settings = [] }) => {
   const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'expenses' | 'tax'>('overview');

   // Modal State
   const [showInvoiceModal, setShowInvoiceModal] = useState(false);
   const [showPaymentModal, setShowPaymentModal] = useState(false);
   const [showExpenseModal, setShowExpenseModal] = useState(false);
   const [showPreviewModal, setShowPreviewModal] = useState(false); // New Preview Modal
   const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

   // Search and Filter State
   const [invoiceSearch, setInvoiceSearch] = useState('');
   const [expenseSearch, setExpenseSearch] = useState('');
   const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'PAID' | 'PARTIAL' | 'UNPAID'>('all');
   const [expenseStatusFilter, setExpenseStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');

   // Data State - loaded from API
   const [invoices, setInvoices] = useState<Invoice[]>(propInvoices);
   const [expenses, setExpenses] = useState<Expense[]>(propExpenses);
   const [sales, setSales] = useState<Sale[]>(propSales);
   const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [newInvoice, setNewInvoice] = useState({ customer: '', amount: '', description: '', due: '', includeVAT: true });
  const [newPayment, setNewPayment] = useState({ amount: '', receipt: '', method: PaymentMethod.CASH });
  const [newExpense, setNewExpense] = useState({
    description: '',
    category: 'Utilities',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const isHeadOffice = currentBranchId === 'HEAD_OFFICE';

  // Helper functions to get company info from settings
  const getCompanyInfo = () => {
    const companyName = settings.find(s => s.settingKey === 'companyName')?.settingValue || 'PMS Pharmacy Ltd';
    const tinNumber = settings.find(s => s.settingKey === 'tinNumber')?.settingValue || '123-456-789';
    const vrnNumber = settings.find(s => s.settingKey === 'vrnNumber')?.settingValue || '400-999-111';
    const address = settings.find(s => s.settingKey === 'address')?.settingValue || 'Bagamoyo Road, Dar es Salaam';
    const phone = settings.find(s => s.settingKey === 'phone')?.settingValue || '+255 700 123 456';
    const email = settings.find(s => s.settingKey === 'email')?.settingValue || 'info@pms.co.tz';
    const logo = settings.find(s => s.settingKey === 'logo')?.settingValue || '/pharmacy-logo.png';

    return { companyName, tinNumber, vrnNumber, address, phone, email, logo };
  };

  // Load data from API on mount
  React.useEffect(() => {
    const loadFinanceData = async () => {
      setIsLoading(true);
      try {
        const [invoicesData, expensesData, salesData] = await Promise.all([
          api.getInvoices(),
          api.getExpenses(),
          api.getSales()
        ]);

        setInvoices(invoicesData || []);
        setExpenses(expensesData || []);
        setSales(salesData || []);
      } catch (error) {
        console.error('Failed to load finance data:', error);
        // Keep prop data as fallback
        setInvoices(propInvoices);
        setExpenses(propExpenses);
        setSales(propSales);
      } finally {
        setIsLoading(false);
      }
    };

    loadFinanceData();
  }, [currentBranchId]); // Reload when branch changes

  // Filter Data Logic
  const filteredInvoices = isHeadOffice ? invoices : invoices.filter(i => i.branchId === currentBranchId);
  const filteredExpenses = isHeadOffice ? expenses : expenses.filter(e => e.branchId === currentBranchId);
  const filteredSales = isHeadOffice ? sales : sales.filter(s => s.branchId === currentBranchId);

  // Search and Filter Logic
  const searchedInvoices = filteredInvoices.filter(inv =>
    inv.customerName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    inv.id.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    inv.description.toLowerCase().includes(invoiceSearch.toLowerCase())
  ).filter(inv => invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter);

  const searchedExpenses = filteredExpenses.filter(exp =>
    exp.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
    exp.category.toLowerCase().includes(expenseSearch.toLowerCase())
  ).filter(exp => expenseStatusFilter === 'all' || exp.status === expenseStatusFilter);

  // Permission Logic for Expense Approval
  const canApproveExpenses = (expense: Expense) => {
    if (!currentUser) return false;

    // SUPER_ADMIN can approve all expenses
    if (currentUser.role === UserRole.SUPER_ADMIN) return true;

    // ACCOUNTANT can approve all expenses
    if (currentUser.role === UserRole.ACCOUNTANT) return true;

    // BRANCH_MANAGER can approve expenses from their branch
    if (currentUser.role === UserRole.BRANCH_MANAGER && expense.branchId === currentUser.branchId) return true;

    return false;
  };

  const canViewExpenseDetails = () => {
    if (!currentUser) return false;
    return [UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT, UserRole.BRANCH_MANAGER, UserRole.AUDITOR].includes(currentUser.role);
  };

  // DYNAMIC CALCULATIONS
  const stats = useMemo(() => {
    const revenue = filteredSales.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const profit = filteredSales.reduce((acc, curr) => acc + curr.profit, 0);
    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = profit - totalExpenses;
    const receivables = filteredInvoices.reduce((acc, i) => acc + (i.totalAmount - i.paidAmount), 0);

    return { revenue, netProfit, totalExpenses, receivables };
  }, [filteredSales, filteredExpenses, filteredInvoices]);


  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportInvoices = () => {
    const exportData = filteredInvoices.map(inv => ({
      'Invoice ID': inv.id,
      'Customer': inv.customerName,
      'Total Amount': inv.totalAmount,
      'Paid Amount': inv.paidAmount,
      'Balance': inv.totalAmount - inv.paidAmount,
      'Status': inv.status,
      'Date Issued': inv.dateIssued,
      'Due Date': inv.dueDate,
      'Description': inv.description
    }));
    exportToCSV(exportData, `invoices_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportExpenses = () => {
    const exportData = filteredExpenses.map(exp => ({
      'Description': exp.description,
      'Category': exp.category,
      'Amount': exp.amount,
      'Date': exp.date,
      'Status': exp.status,
      'Branch': branches.find(b => b.id === exp.branchId)?.name || 'Unknown'
    }));
    exportToCSV(exportData, `expenses_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Income Vs Expense Chart Data
  const incomeVsExpenseData = useMemo(() => {
      const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
      });

      return last7Days.map(dateStr => {
          const daySales = filteredSales.filter(s => s.date.startsWith(dateStr));
          const dayExpenses = filteredExpenses.filter(e => e.date === dateStr);
          
          return {
              name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
              sales: daySales.reduce((sum, s) => sum + s.totalAmount, 0),
              expense: dayExpenses.reduce((sum, e) => sum + e.amount, 0)
          };
      });
  }, [filteredSales, filteredExpenses]);

  const handleCreateInvoice = async () => {
    if(!newInvoice.customer || !newInvoice.amount) return;

    try {
      const invoiceData: Partial<Invoice> = {
        branchId: isHeadOffice ? 'BR001' : currentBranchId, // Default to BR001 if HO creates
        customerName: newInvoice.customer,
        dateIssued: new Date().toISOString().split('T')[0],
        dueDate: newInvoice.due || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        totalAmount: parseFloat(newInvoice.amount),
        paidAmount: 0,
        status: 'UNPAID' as Invoice['status'],
        description: newInvoice.description || 'General Supplies',
        source: 'MANUAL',
        items: [],
        payments: [],
        includeVAT: newInvoice.includeVAT
      };

      const createdInvoice = await api.createInvoice(invoiceData);
      setInvoices(prev => [createdInvoice, ...prev]);

      if (onProcessPayment) {
        onProcessPayment(createdInvoice); // Notify parent component
      }

      setShowInvoiceModal(false);
      setNewInvoice({ customer: '', amount: '', description: '', due: '', includeVAT: true });
    } catch (error) {
      console.error('Failed to create invoice:', error);
      // Fallback to local creation if API fails
      const invoice: Invoice = {
        id: `INV-2023-${Math.floor(Math.random() * 1000)}`,
        branchId: isHeadOffice ? 'BR001' : currentBranchId,
        customerName: newInvoice.customer,
        dateIssued: new Date().toISOString().split('T')[0],
        dueDate: newInvoice.due || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        totalAmount: parseFloat(newInvoice.amount),
        paidAmount: 0,
        status: 'UNPAID',
        description: newInvoice.description || 'General Supplies',
        source: 'MANUAL',
        items: [],
        payments: [],
        includeVAT: newInvoice.includeVAT,
        archived: false
      };

      setInvoices(prev => [invoice, ...prev]);
      if (onProcessPayment) {
        onProcessPayment(invoice);
      }

      setShowInvoiceModal(false);
      setNewInvoice({ customer: '', amount: '', description: '', due: '', includeVAT: true });
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const remaining = invoice.totalAmount - invoice.paidAmount;
    // Generate a unique receipt number automatically
    const generatedReceipt = `TRA-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    
    setNewPayment({
        amount: remaining.toString(), // Auto-fill remaining balance
        receipt: generatedReceipt,
        method: PaymentMethod.CASH
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = () => {
    if(!selectedInvoice || !newPayment.amount || !newPayment.receipt) return;
    
    const amount = parseFloat(newPayment.amount);
    const newPaidAmount = selectedInvoice.paidAmount + amount;
    
    let newStatus: Invoice['status'] = 'PARTIAL';
    if(newPaidAmount >= selectedInvoice.totalAmount) newStatus = 'PAID';
    if(newPaidAmount === 0) newStatus = 'UNPAID';

    const updatedInvoice: Invoice = {
        ...selectedInvoice,
        paidAmount: newPaidAmount,
        status: newStatus,
        payments: [
            ...selectedInvoice.payments,
            {
                id: `PAY-${Date.now()}`,
                amount: amount,
                date: new Date().toISOString().split('T')[0],
                receiptNumber: newPayment.receipt,
                method: newPayment.method,
                recordedBy: 'Current User'
            }
        ]
    };

    onProcessPayment(updatedInvoice); // This triggers inventory deduction in App.tsx if fully paid
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    setNewPayment({ amount: '', receipt: '', method: PaymentMethod.CASH });
  };

  const handleRecordExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;

    try {
      const expenseData: Partial<Expense> = {
        category: newExpense.category,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date,
        status: 'Pending',
        branchId: currentBranchId
      };

      const createdExpense = await api.createExpense(expenseData);
      setExpenses(prev => [createdExpense, ...prev]);

      if (onCreateExpense) {
        onCreateExpense(createdExpense);
      }

      setShowExpenseModal(false);
      setNewExpense({
        description: '',
        category: 'Utilities',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Failed to create expense:', error);
      // Fallback to local creation if API fails
      const expense: Expense = {
        id: Date.now(),
        category: newExpense.category,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date,
        status: 'Pending',
        branchId: currentBranchId,
        archived: false
      };

      setExpenses(prev => [expense, ...prev]);
      if (onCreateExpense) {
        onCreateExpense(expense);
      }

      setShowExpenseModal(false);
      setNewExpense({
        description: '',
        category: 'Utilities',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleViewInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setShowPreviewModal(true);
  };

  const handlePrintInvoice = () => {
      window.print();
  };

  const handleExpenseAction = (id: number, action: 'Approved' | 'Rejected') => {
      // This will be passed as onActionExpense prop from App.tsx
      // For now, we'll implement a basic version that shows an alert
      alert(`${action} expense #${id}`);
  };

  return (
    <div className="space-y-8">
      {/* Screen-Only Content */}
      <div className="no-print space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Finance & Accounting</h2>
            <p className="text-slate-500 mt-1">
              {isHeadOffice ? 'Global Financial Overview' : `Financials for ${branches.find(b => b.id === currentBranchId)?.name || 'Current Branch'}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'overview' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'invoices' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Invoicing & POS
            </button>
            <button 
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'expenses' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Expenses
            </button>
            <button 
              onClick={() => setActiveTab('tax')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'tax' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Tax & TRA
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Gross Revenue" value={`TZS ${(stats.revenue / 1000000).toFixed(2)}M`} subtext="All Time" icon={DollarSign} color="bg-emerald-600" />
                <StatCard title="Net Profit" value={`TZS ${(stats.netProfit / 1000000).toFixed(2)}M`} subtext="After Tax & Exp" icon={TrendingUp} color="bg-teal-600" />
                <StatCard title="Total Expenses" value={`TZS ${(stats.totalExpenses / 1000000).toFixed(2)}M`} subtext={`${filteredExpenses.length} Transactions`} icon={TrendingDown} color="bg-rose-500" />
                <StatCard title="Outstanding Invoices" value={`TZS ${(stats.receivables/1000000).toFixed(2)}M`} subtext="Receivables" icon={FileText} color="bg-blue-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Income vs Expense Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Income vs Expenses (7 Days)</h3>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incomeVsExpenseData} barGap={0}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${value/1000}k`} />
                        <Tooltip 
                            cursor={{fill: '#f1f5f9'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`TZS ${value.toLocaleString()}`, '']}
                        />
                        <Bar dataKey="sales" name="Income" fill="#0d9488" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Payment Breakdown</h3>
                  <div className="h-60 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={PAYMENT_METHODS_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {PAYMENT_METHODS_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `TZS ${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <span className="text-2xl font-bold text-slate-800">100%</span>
                        <p className="text-xs text-slate-500 uppercase">Mix</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        )}

        {activeTab === 'invoices' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
               <h3 className="text-lg font-bold text-slate-800">Invoices & Receivables</h3>
               <div className="flex flex-col sm:flex-row gap-3">
                 {/* Search Input */}
                 <div className="relative">
                   <input
                     type="text"
                     placeholder="Search invoices..."
                     value={invoiceSearch}
                     onChange={(e) => setInvoiceSearch(e.target.value)}
                     className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                   />
                   <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                 </div>

                 {/* Status Filter */}
                 <select
                   value={invoiceStatusFilter}
                   onChange={(e) => setInvoiceStatusFilter(e.target.value as any)}
                   className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                 >
                   <option value="all">All Status</option>
                   <option value="PAID">Paid</option>
                   <option value="PARTIAL">Partial</option>
                   <option value="UNPAID">Unpaid</option>
                 </select>

                 <button
                   onClick={() => setShowInvoiceModal(true)}
                   className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm shadow-md shadow-teal-600/20"
                 >
                   <FilePlus size={16} /> Create Manual Invoice
                 </button>
               </div>
             </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Invoice ID</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Origin</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Total Amount</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Paid / Balance</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {searchedInvoices.map((inv) => {
                          const balance = inv.totalAmount - inv.paidAmount;
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono text-sm text-slate-600">{inv.id}</td>
                                <td className="px-6 py-4">
                                    {inv.source === 'POS' ? (
                                        <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                                            <Store size={10} /> POS
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">
                                            <FileText size={10} /> Manual
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800 text-sm">{inv.customerName}</div>
                                    <div className="text-xs text-slate-500">{inv.description}</div>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">TZS {inv.totalAmount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-emerald-600 font-medium">{inv.paidAmount.toLocaleString()}</span>
                                        {balance > 0 && <span className="text-rose-500 text-xs">Bal: {balance.toLocaleString()}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                        inv.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                        'bg-rose-100 text-rose-700'
                                    }`}>
                                        {inv.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                          <button 
                                              onClick={() => handleViewInvoice(inv)}
                                              className="text-slate-500 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded" 
                                              title="View Invoice"
                                          >
                                              <Eye size={16} />
                                          </button>
                                        {inv.status !== 'PAID' ? (
                                          <button 
                                            onClick={() => openPaymentModal(inv)}
                                            className="text-teal-600 hover:text-teal-800 font-bold text-xs bg-teal-50 px-2 py-1 rounded hover:bg-teal-100 flex items-center gap-1 transition-colors"
                                          >
                                              <Wallet size={12} /> Pay Now
                                          </button>
                                        ) : (
                                            <div className="flex gap-2 items-center">
                                                <span className="text-slate-400 text-xs flex items-center gap-1 px-2">
                                                    <CheckCircle size={12} /> Paid
                                                </span>
                                                {onArchiveItem && (
                                                    <button 
                                                        onClick={() => onArchiveItem('invoice', inv.id)}
                                                        className="text-slate-400 hover:text-amber-600 p-1.5 hover:bg-amber-50 rounded"
                                                        title="Archive"
                                                    >
                                                        <Archive size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                          )
                          })}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                 <h3 className="text-lg font-bold text-slate-800">Operational Expenses</h3>
                 <div className="flex flex-col sm:flex-row gap-3">
                   {/* Search Input */}
                   <div className="relative">
                     <input
                       type="text"
                       placeholder="Search expenses..."
                       value={expenseSearch}
                       onChange={(e) => setExpenseSearch(e.target.value)}
                       className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                     />
                     <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                     </svg>
                   </div>

                   {/* Status Filter */}
                   <select
                     value={expenseStatusFilter}
                     onChange={(e) => setExpenseStatusFilter(e.target.value as any)}
                     className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                   >
                     <option value="all">All Status</option>
                     <option value="Pending">Pending</option>
                     <option value="Approved">Approved</option>
                     <option value="Rejected">Rejected</option>
                   </select>

                   {!isHeadOffice && (
                     <button
                       onClick={() => setShowExpenseModal(true)}
                       className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium text-sm shadow-md shadow-rose-600/20"
                     >
                       <Plus size={16} /> Record Expense
                     </button>
                   )}
                 </div>
               </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Description</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Category</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Branch</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase min-w-[200px]">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {searchedExpenses.map((exp) => (
                              <tr key={exp.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 font-medium text-slate-800">{exp.description}</td>
                                  <td className="px-6 py-4 text-sm text-slate-600">{exp.category}</td>
                                  <td className="px-6 py-4 text-xs text-slate-500">{branches.find(b => b.id === exp.branchId)?.name || 'Unknown'}</td>
                                  <td className="px-6 py-4 font-bold text-slate-800">TZS {exp.amount.toLocaleString()}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        exp.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                                        exp.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                                        'bg-amber-100 text-amber-700'
                                      }`}>
                                          {exp.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-1 flex-wrap">
                                          {exp.status === 'Pending' && canApproveExpenses(exp) && (
                                              <>
                                                  <button
                                                      onClick={() => handleExpenseAction(exp.id, 'Approved')}
                                                      className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                                      title="Approve Expense"
                                                  >
                                                      <CheckCircle size={16} />
                                                  </button>
                                                  <button
                                                      onClick={() => handleExpenseAction(exp.id, 'Rejected')}
                                                      className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
                                                      title="Reject Expense"
                                                  >
                                                      <XCircle size={16} />
                                                  </button>
                                              </>
                                          )}
                                          {canViewExpenseDetails() && (
                                              <button
                                                  onClick={() => {
                                                      // Show expense details modal
                                                      alert(`Expense Details:\n\nDescription: ${exp.description}\nCategory: ${exp.category}\nAmount: TZS ${exp.amount.toLocaleString()}\nDate: ${exp.date}\nBranch: ${branches.find(b => b.id === exp.branchId)?.name || 'Unknown'}\nStatus: ${exp.status}`);
                                                  }}
                                                  className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                  title="View Details"
                                              >
                                                  <Eye size={16} />
                                              </button>
                                          )}
                                          {/* Additional Actions for Super Admin and Accountant (Finance) */}
                                          {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ACCOUNTANT || true) && ( // TEMP: Show for all users for testing
                                              <>
                                                  <button
                                                      onClick={() => {
                                                          // Export individual expense
                                                          const expenseData = [{
                                                              'Description': exp.description,
                                                              'Category': exp.category,
                                                              'Amount': exp.amount,
                                                              'Date': exp.date,
                                                              'Status': exp.status,
                                                              'Branch': branches.find(b => b.id === exp.branchId)?.name || 'Unknown'
                                                          }];
                                                          exportToCSV(expenseData, `expense_${exp.id}_${new Date().toISOString().split('T')[0]}.csv`);
                                                      }}
                                                      className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-sm"
                                                      title="Export Expense (Super Admin & Finance)"
                                                  >
                                                      <FileText size={14} />
                                                  </button>
                                                  {currentUser?.role === UserRole.SUPER_ADMIN && exp.status === 'Pending' && (
                                                      <button
                                                          onClick={() => {
                                                              if (window.confirm(`Are you sure you want to delete this expense?\n\nDescription: ${exp.description}\nAmount: TZS ${exp.amount.toLocaleString()}\n\nThis action cannot be undone.`)) {
                                                                  // For now, we'll show an alert. In a real app, this would call an API
                                                                  alert(`Expense #${exp.id} would be deleted. (API integration needed)`);
                                                              }
                                                          }}
                                                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                                                          title="Delete Expense (Super Admin Only)"
                                                      >
                                                          <X size={14} />
                                                      </button>
                                                  )}
                                                  <button
                                                      onClick={() => onArchiveItem && onArchiveItem('expense', exp.id)}
                                                      className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
                                                      title="Archive Expense (Super Admin & Finance)"
                                                  >
                                                      <Archive size={14} />
                                                  </button>
                                              </>
                                          )}
                                          {['Approved', 'Rejected'].includes(exp.status) && onArchiveItem && (
                                              <button
                                                  onClick={() => onArchiveItem('expense', exp.id)}
                                                  className="text-slate-400 hover:text-amber-600 p-1.5 hover:bg-amber-50 rounded"
                                                  title="Archive"
                                              >
                                                  <Archive size={16} />
                                              </button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredExpenses.length === 0 && (
                              <tr>
                                  <td colSpan={6} className="p-8 text-center text-slate-500">No expenses recorded for this view.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-8">
                  <div>
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                          <Building size={24} className="text-teal-600" />
                          TRA VAT Report {isHeadOffice && '(Consolidated)'}
                      </h3>
                      <p className="text-slate-500 text-sm mt-1">Tax Identification Number (TIN): 123-456-789</p>
                  </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-600 font-medium">Total Taxable Value</span>
                      <span className="font-bold text-slate-900">TZS {(stats.revenue * 0.82).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-600 font-medium">VAT Amount (18%)</span>
                      <span className="font-bold text-slate-900">TZS {(stats.revenue * 0.18).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <InvoiceModal
        showInvoiceModal={showInvoiceModal}
        setShowInvoiceModal={setShowInvoiceModal}
        newInvoice={newInvoice}
        setNewInvoice={setNewInvoice}
        handleCreateInvoice={handleCreateInvoice}
      />

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Record Payment</h3>
                <p className="text-sm text-slate-500 mb-4">For Invoice #{selectedInvoice.id}</p>
                <div className="p-3 bg-slate-50 rounded-lg mb-4 text-sm">
                    <div className="flex justify-between mb-1">
                        <span>Total Due:</span>
                        <span className="font-bold">{selectedInvoice.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                        <span>Remaining Balance:</span>
                        <span className="font-bold">{(selectedInvoice.totalAmount - selectedInvoice.paidAmount).toLocaleString()}</span>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700">Receipt Number (System Generated)</label>
                        <div className="relative">
                            <Receipt size={16} className="absolute left-3 top-3 text-slate-400" />
                            <input 
                              type="text" 
                              className="w-full pl-9 p-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed" 
                              placeholder="Auto-generated"
                              value={newPayment.receipt}
                              readOnly
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Payment Amount</label>
                        <div className="relative">
                            <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                            <input 
                              type="number" 
                              className="w-full pl-9 p-2 border border-slate-300 rounded-lg font-bold" 
                              placeholder="0.00"
                              value={newPayment.amount}
                              onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                         <label className="text-sm font-medium text-slate-700">Payment Method</label>
                         <select 
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            value={newPayment.method}
                            onChange={(e) => setNewPayment({...newPayment, method: e.target.value as PaymentMethod})}
                         >
                            <option value={PaymentMethod.CASH}>Cash</option>
                            <option value={PaymentMethod.MOBILE_MONEY}>Mobile Money</option>
                            <option value={PaymentMethod.INSURANCE}>Insurance</option>
                         </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                    <button onClick={handleRecordPayment} className="px-4 py-2 bg-teal-600 text-white rounded-lg">Save Payment</button>
                </div>
            </div>
        </div>
      )}

      <InvoicePreviewModal
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        selectedInvoice={selectedInvoice}
        handlePrintInvoice={handlePrintInvoice}
        openPaymentModal={openPaymentModal}
      />

      <ExpenseModal
        showExpenseModal={showExpenseModal}
        setShowExpenseModal={setShowExpenseModal}
        newExpense={newExpense}
        setNewExpense={setNewExpense}
        handleRecordExpense={handleRecordExpense}
      />

      {/* Print View Hidden on Screen - Visible only during print via CSS class */}
      <div className="print-only">
            <style>
                {`
                @media print {
                    .print-only {
                        page-break-inside: avoid;
                        page-break-before: always;
                        page-break-after: always;
                    }
                    .print-only * {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    @page {
                        size: A4;
                        margin: 1cm;
                    }
                }
                `}
            </style>
            {(() => {
                const companyInfo = getCompanyInfo();
                return (
                    <div className="max-w-4xl mx-auto border border-black p-8 text-black" style={{minHeight: '29.7cm', maxHeight: '29.7cm'}}>
                         {/* Header */}
                         <div className="text-center mb-8">
                             <img src={companyInfo.logo} alt={`${companyInfo.companyName} Logo`} className="h-20 w-auto mx-auto mb-4" />
                             <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">{companyInfo.companyName}</h1>
                             <div className="text-sm space-y-1">
                                 <p>TIN: {companyInfo.tinNumber} | VRN: {companyInfo.vrnNumber}</p>
                                 <p>{companyInfo.address}</p>
                                 <p>Tel: {companyInfo.phone} | Email: {companyInfo.email}</p>
                             </div>
                         </div>

                <hr className="border-black my-6"/>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-4">{selectedInvoice?.status === 'PAID' ? 'TAX INVOICE' : 'PROFORMA INVOICE'}</h2>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-semibold">Invoice #:</span> {selectedInvoice?.id || '---'}</p>
                            <p><span className="font-semibold">Date Issued:</span> {selectedInvoice?.dateIssued || new Date().toISOString().split('T')[0]}</p>
                            <p><span className="font-semibold">Due Date:</span> {selectedInvoice?.dueDate || '---'}</p>
                            {selectedInvoice?.paymentMethod && (
                                <p><span className="font-semibold">Payment Method:</span> {selectedInvoice.paymentMethod}</p>
                            )}
                        </div>
                    </div>
                    <div className="text-right flex-1">
                        <div className="border border-black p-4 inline-block">
                            <h3 className="font-bold mb-2">Bill To:</h3>
                            <p className="text-lg font-semibold">{selectedInvoice?.customerName}</p>
                            <p className="text-sm mt-2">Customer ID: {selectedInvoice?.customerName.split(' ').join('').toUpperCase()}</p>
                        </div>
                        <div className="mt-4 text-right">
                            <span className={`inline-block px-4 py-2 border border-black text-sm font-bold ${selectedInvoice?.status === 'PAID' ? 'bg-gray-100' : ''}`}>
                                Status: {selectedInvoice?.status || 'UNPAID'}
                            </span>
                        </div>
                    </div>
                </div>
                <hr className="border-black my-6"/>
                <table className="w-full text-left mb-8 border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-3 px-2 text-left font-bold">Item Description</th>
                            <th className="py-3 px-2 text-center font-bold">Qty</th>
                            <th className="py-3 px-2 text-right font-bold">Unit Price</th>
                            <th className="py-3 px-2 text-right font-bold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedInvoice?.items && selectedInvoice.items.length > 0 ? selectedInvoice.items.map((item, idx) => (
                             <tr key={idx} className="border-b border-gray-300">
                                 <td className="py-3 px-2 font-medium">{item.name}</td>
                                 <td className="py-3 px-2 text-center">{item.quantity}</td>
                                 <td className="py-3 px-2 text-right">{item.price.toLocaleString()}</td>
                                 <td className="py-3 px-2 text-right font-semibold">{(item.price * item.quantity).toLocaleString()}</td>
                             </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="py-6 px-2 text-center font-medium">Consolidated Invoice Items</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <hr className="border-black my-6"/>
                <div className="flex justify-end">
                    <div className="w-80 space-y-3 text-sm">
                        {selectedInvoice?.includeVAT ? (
                            <>
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>{(selectedInvoice?.totalAmount ? (selectedInvoice.totalAmount / 1.18).toFixed(0) : '0')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>VAT (18%):</span>
                                    <span>{(selectedInvoice?.totalAmount ? (selectedInvoice.totalAmount - (selectedInvoice.totalAmount / 1.18)).toFixed(0) : '0')}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-between">
                                <span>Amount:</span>
                                <span>{selectedInvoice?.totalAmount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg border-t border-black pt-3">
                            <span>Grand Total:</span>
                            <span>{selectedInvoice?.totalAmount.toLocaleString()} TZS</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Amount Paid:</span>
                            <span>- {selectedInvoice?.paidAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-black pt-2">
                            <span>Balance Due:</span>
                            <span>{((selectedInvoice?.totalAmount || 0) - (selectedInvoice?.paidAmount || 0)).toLocaleString()} TZS</span>
                        </div>
                    </div>
                </div>
                {selectedInvoice?.status === 'PAID' && (
                     <div className="mt-6 text-center border-2 border-black p-3 font-bold text-lg">PAID IN FULL</div>
                )}
                <div className="mt-12 text-center text-sm border-t border-black pt-6">
                    <p className="font-semibold">Thank you for your business!</p>
                    <p className="mt-2 text-xs">This is a computer-generated invoice and does not require a signature.</p>
                    <p className="mt-1 text-xs">For inquiries, contact us at {companyInfo.phone}</p>
                </div>
                   </div>
               );
           })()}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      <span className="text-slate-400">{subtext}</span>
    </div>
  </div>
);

export default Finance;
