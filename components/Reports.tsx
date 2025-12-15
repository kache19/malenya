import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  Activity,
  Download,
  Filter,
  Calendar,
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle,
  FileBarChart,
  Loader,
  Plus,
  X,
  User,
  Building,
  BarChart3
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog, BranchInventoryItem, Sale, Expense, Branch, Product } from '../types';

const COLORS = ['#0f766e', '#14b8a6', '#f59e0b', '#f43f5e', '#64748b'];

interface ReportsProps {
  currentBranchId: string;
  inventory: Record<string, BranchInventoryItem[]>;
  sales: Sale[];
  expenses: Expense[];
}

const Reports: React.FC<ReportsProps> = ({ currentBranchId, inventory, sales, expenses }) => {
  const [activeTab, setActiveTab] = useState<'finance' | 'inventory' | 'audit' | 'activity'>('finance');
  const [auditFilter, setAuditFilter] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [realTimeData, setRealTimeData] = useState({
    activeUsers: 0,
    pendingApprovals: 0,
    systemAlerts: 0,
    recentTransactions: 0
  });

  // Load branches, products, and audit logs
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setError(null);
        const [branchesData, productsData, auditData, sessionsData] = await Promise.all([
          api.getBranches(),
          api.getProducts(),
          api.getAuditLogs(),
          api.getSessions()
        ]);
        if (mounted) {
          setBranches(branchesData || []);
          setProducts(productsData || []);
          setAuditLogs(auditData || []);
          setSessions(sessionsData || []);
          setLastUpdate(new Date());

          // Calculate real-time metrics
          const recentLogs = auditData?.filter(log =>
            new Date(log.timestamp || '').getTime() > Date.now() - 24 * 60 * 60 * 1000
          ) || [];
          const pendingApprovals = recentLogs.filter(log =>
            log.action.includes('PENDING') || log.action.includes('REQUEST')
          ).length;
          const systemAlerts = recentLogs.filter(log =>
            log.severity === 'CRITICAL' || log.severity === 'WARNING'
          ).length;

          setRealTimeData({
            activeUsers: sessions.length,
            pendingApprovals,
            systemAlerts,
            recentTransactions: recentLogs.filter(log =>
              log.action.includes('SALE') || log.action.includes('PAYMENT')
            ).length
          });
        }
      } catch (err) {
        console.error('Failed to load report data:', err);
        if (mounted) {
          setError('Failed to load report data. Some features may be limited.');
          // Fallback to empty arrays
          setBranches([]);
          setProducts([]);
          setAuditLogs([]);
          setSessions([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      if (mounted) {
        loadData();
      }
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const isHeadOffice = currentBranchId === 'HEAD_OFFICE';
  const branchName = branches.find(b => b.id === currentBranchId)?.name || 'All Branches';

  // Dynamic filtering
  const filteredSales = useMemo(
    () => isHeadOffice ? sales : sales.filter(s => s.branchId === currentBranchId),
    [sales, currentBranchId, isHeadOffice]
  );

  const filteredExpenses = useMemo(
    () => isHeadOffice ? expenses : expenses.filter(e => e.branchId === currentBranchId),
    [expenses, currentBranchId, isHeadOffice]
  );

  // Calculate Advanced Finance Stats
  const financeStats = useMemo(() => {
    const revenue = filteredSales.reduce((acc, curr) => {
      const amount = curr.totalAmount || (curr as any).total || 0;
      return acc + (typeof amount === 'number' ? amount : 0);
    }, 0);

    const profit = filteredSales.reduce((acc, curr) => {
      const p = (curr as any).profit || 0;
      return acc + (typeof p === 'number' ? p : 0);
    }, 0);

    const expenseTotal = filteredExpenses.reduce((acc, curr) => {
      return acc + (typeof curr.amount === 'number' ? curr.amount : 0);
    }, 0);

    // Calculate cost of goods sold (COGS) from sales data
    const cogs = filteredSales.reduce((acc, curr) => {
      const cost = (curr as any).totalCost || 0;
      return acc + (typeof cost === 'number' ? cost : 0);
    }, 0);

    // Advanced metrics
    const grossMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const netProfit = profit - expenseTotal;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const expenseRatio = revenue > 0 ? (expenseTotal / revenue) * 100 : 0;

    // Sales metrics
    const totalTransactions = filteredSales.length;
    const averageTransaction = totalTransactions > 0 ? revenue / totalTransactions : 0;

    // Expense breakdown by category
    const expenseByCategory = filteredExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      revenue,
      profit,
      expenses: expenseTotal,
      cogs,
      netProfit,
      grossMargin,
      netMargin,
      expenseRatio,
      totalTransactions,
      averageTransaction,
      expenseByCategory
    };
  }, [filteredSales, filteredExpenses]);

  // Chart Data: Sales per Day (Last 7 days)
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(dateStr => {
      const daySales = filteredSales.filter(s => {
        const saleDate = (s as any).date || '';
        return saleDate.startsWith(dateStr);
      });

      const salesAmount = daySales.reduce((sum, s) => {
        const amount = s.totalAmount || (s as any).total || 0;
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0);

      return {
        name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
        sales: salesAmount
      };
    });
  }, [filteredSales]);

  // Advanced Inventory Analytics
  const inventoryAnalytics = useMemo(() => {
    const branchesToCheck = isHeadOffice ? Object.keys(inventory) : [currentBranchId];
    let totalValuation = 0;
    let totalStock = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    const productAnalytics: any[] = [];

    branchesToCheck.forEach(bId => {
      const items = inventory[bId] || [];
      items.forEach(i => {
        const product = products.find(p => p.id === i.productId);
        if (product) {
          const costPrice = (product as any).costPrice || product.price || 0;
          const sellingPrice = i.customPrice || product.price || 0;
          const qty = typeof i.quantity === 'number' ? i.quantity : 0;
          const value = qty * costPrice;

          totalValuation += value;
          totalStock += qty;

          if (qty === 0) outOfStockItems++;
          else if (qty <= (product.minStockLevel || 10)) lowStockItems++;

          // Calculate stock turnover (simplified - would need sales data)
          const turnoverRate = 0; // TODO: calculate from sales history

          productAnalytics.push({
            productId: product.id,
            name: product.name,
            category: product.category,
            quantity: qty,
            value: value,
            costPrice,
            sellingPrice,
            margin: sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0,
            turnoverRate,
            stockStatus: qty === 0 ? 'out_of_stock' : qty <= (product.minStockLevel || 10) ? 'low_stock' : 'normal',
            batches: i.batches?.length || 0
          });
        }
      });
    });

    // ABC Analysis
    const sortedByValue = productAnalytics.sort((a, b) => b.value - a.value);
    const totalValue = sortedByValue.reduce((sum, item) => sum + item.value, 0);

    let cumulativeValue = 0;
    const abcAnalysis = sortedByValue.map((item, index) => {
      cumulativeValue += item.value;
      const cumulativePercent = (cumulativeValue / totalValue) * 100;

      let abcClass = 'C';
      if (cumulativePercent <= 80) abcClass = 'A';
      else if (cumulativePercent <= 95) abcClass = 'B';

      return { ...item, abcClass, cumulativeValue, cumulativePercent };
    });

    // Stock turnover analysis
    const turnoverAnalysis = {
      fastMoving: productAnalytics.filter(p => p.turnoverRate > 6).length,
      slowMoving: productAnalytics.filter(p => p.turnoverRate < 2).length,
      averageTurnover: productAnalytics.reduce((sum, p) => sum + p.turnoverRate, 0) / productAnalytics.length
    };

    return {
      totalValuation,
      totalStock,
      lowStockItems,
      outOfStockItems,
      productAnalytics,
      abcAnalysis,
      turnoverAnalysis,
      stockEfficiency: totalStock > 0 ? (totalValuation / totalStock) : 0
    };
  }, [inventory, currentBranchId, isHeadOffice, products]);

  // Filter Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchBranch = isHeadOffice ? true : log.branchId === currentBranchId;
      const matchSearch = log.details?.toLowerCase().includes(auditFilter.toLowerCase()) ||
        log.action?.toLowerCase().includes(auditFilter.toLowerCase()) ||
        log.userName?.toLowerCase().includes(auditFilter.toLowerCase());
      return matchBranch && matchSearch;
    });
  }, [auditLogs, auditFilter, currentBranchId, isHeadOffice]);

  // Real-time Activity Feed
  const activityFeed = useMemo(() => {
    const recentLogs = auditLogs
      .filter(log => {
        const logTime = new Date(log.timestamp || '').getTime();
        return Date.now() - logTime < 24 * 60 * 60 * 1000; // Last 24 hours
      })
      .sort((a, b) => new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime())
      .slice(0, 10);

    return recentLogs.map(log => ({
      id: log.id,
      type: log.action?.includes('CREATE') ? 'create' :
            log.action?.includes('UPDATE') ? 'update' :
            log.action?.includes('DELETE') ? 'delete' :
            log.action?.includes('APPROVE') ? 'approve' : 'info',
      title: log.action?.replace(/_/g, ' ') || 'Activity',
      description: log.details || '',
      user: log.userName || 'System',
      timestamp: log.timestamp || '',
      branch: branches.find(b => b.id === log.branchId)?.name || log.branchId,
      severity: log.severity
    }));
  }, [auditLogs, branches]);

  // Export function
  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    try {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row =>
          headers.map(fieldName => {
            const value = row[fieldName];
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return typeof value === 'number' ? value : (value || '');
          }).join(',')
        )
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleExport = (format: string) => {
    if (format === 'PDF') {
      window.print();
      return;
    }

    let dataToExport: any[] = [];
    const dateStr = new Date().toISOString().split('T')[0];
    const branchNameSafe = branchName.replace(/\s+/g, '_');
    const filename = `PMS_${activeTab}_Report_${branchNameSafe}_${dateStr}.csv`;

    try {
      if (activeTab === 'finance') {
        dataToExport = filteredSales.map((s: Sale) => ({
          ID: s.id,
          Date: (s as any).date || '',
          Total_Amount: s.totalAmount || (s as any).total || 0,
          Profit: (s as any).profit || 0,
          Payment_Method: (s as any).paymentMethod || 'Unknown',
          Branch: branches.find(b => b.id === s.branchId)?.name || s.branchId
        }));

        // Append summary row
        if (dataToExport.length > 0) {
          dataToExport.push({});
          dataToExport.push({
            ID: 'TOTAL_SUMMARY',
            Total_Amount: financeStats.revenue,
            Profit: financeStats.profit,
            Branch: isHeadOffice ? 'All Branches' : branchName
          });
        }
      } else if (activeTab === 'inventory') {
        const branchesToExport = isHeadOffice ? Object.keys(inventory) : [currentBranchId];

        branchesToExport.forEach(bId => {
          const bName = branches.find(b => b.id === bId)?.name || bId;
          const items = inventory[bId] || [];
          items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              dataToExport.push({
                Branch: bName,
                Product_ID: product.id,
                Product_Name: product.name,
                Generic_Name: product.genericName,
                Category: product.category,
                Quantity: item.quantity,
                Unit: product.unit,
                Selling_Price: item.customPrice || product.price,
                Total_Value: item.quantity * (item.customPrice || product.price),
                Batches: item.batches.map(b => `${b.batchNumber}(${b.expiryDate})`).join('; ')
              });
            }
          });
        });
      } else if (activeTab === 'audit') {
        dataToExport = filteredAuditLogs.map(log => ({
          ID: log.id,
          Timestamp: log.timestamp,
          User: log.userName,
          Action: log.action,
          Details: log.details,
          Branch: branches.find(b => b.id === log.branchId)?.name || log.branchId,
          Severity: log.severity
        }));
      }

      downloadCSV(dataToExport, filename);
    } catch (err) {
      console.error('Export preparation failed:', err);
      alert('Failed to prepare export. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-teal-600" size={32} />
          <p className="text-slate-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-500 mt-1">
            {isHeadOffice ? 'Global Intelligence Hub' : `Performance Reports for ${branchName}`}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <button
            onClick={() => handleExport('PDF')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm shadow-sm transition-colors"
          >
            <Download size={16} /> Export PDF
          </button>
          <button
            onClick={() => handleExport('Excel')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm shadow-sm transition-colors"
          >
            <FileBarChart size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit no-print">
        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'finance' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <TrendingUp size={16} /> Financials
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'inventory' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Activity size={16} /> Inventory Health
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'activity' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Activity size={16} /> Live Activity
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'audit' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ShieldAlert size={16} /> Audit Trail
        </button>
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* FINANCIAL TAB */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* Advanced Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {(financeStats.revenue / 1000000).toFixed(1)}M
                  <span className="text-sm text-slate-400 font-normal"> TZS</span>
                </h3>
                <div className="mt-2 text-xs text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-1 rounded">
                  {financeStats.totalTransactions} transactions
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Net Profit</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {(financeStats.netProfit / 1000000).toFixed(1)}M
                  <span className="text-sm text-slate-400 font-normal"> TZS</span>
                </h3>
                <div className="mt-2 text-xs text-blue-600 font-bold bg-blue-50 inline-block px-2 py-1 rounded">
                  Net Margin: {financeStats.netMargin.toFixed(1)}%
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Gross Margin</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {financeStats.grossMargin.toFixed(1)}%
                </h3>
                <div className="mt-2 text-xs text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-1 rounded">
                  Avg Transaction: {(financeStats.averageTransaction / 1000).toFixed(0)}K TZS
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Op. Expenses</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {(financeStats.expenses / 1000000).toFixed(1)}M
                  <span className="text-sm text-slate-400 font-normal"> TZS</span>
                </h3>
                <div className="mt-2 text-xs text-rose-600 font-bold bg-rose-50 inline-block px-2 py-1 rounded">
                  {financeStats.expenseRatio.toFixed(1)}% of revenue
                </div>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 break-inside-avoid">
              <h4 className="font-bold text-slate-800 mb-4">Expense Breakdown by Category</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(financeStats.expenseByCategory).map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">{category}</span>
                    <span className="text-sm font-bold text-slate-800">{((amount as number) / 1000).toFixed(0)}K TZS</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 break-inside-avoid">
                <h4 className="font-bold text-slate-800 mb-6">Revenue Trend (7 Days)</h4>
                <div className="h-72 bg-slate-50 rounded-lg flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Chart visualization requires additional setup</p>
                    <p className="text-sm mt-2">Revenue data available for export</p>
                  </div>
                </div>
              </div>

              {/* Category Performance */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 break-inside-avoid">
                <h4 className="font-bold text-slate-800 mb-6">Sales by Category</h4>
                <div className="h-72 bg-slate-50 rounded-lg flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Chart visualization requires additional setup</p>
                    <p className="text-sm mt-2">Category data available for export</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Inventory Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Total Stock Value</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {(inventoryAnalytics.totalValuation / 1000000).toFixed(1)}M
                  <span className="text-sm text-slate-400 font-normal"> TZS</span>
                </h3>
                <div className="mt-2 text-xs text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-1 rounded">
                  {inventoryAnalytics.totalStock} units total
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Stock Efficiency</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {(inventoryAnalytics.stockEfficiency / 1000).toFixed(0)}K
                  <span className="text-sm text-slate-400 font-normal"> TZS/unit</span>
                </h3>
                <div className="mt-2 text-xs text-blue-600 font-bold bg-blue-50 inline-block px-2 py-1 rounded">
                  Avg cost per unit
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Low Stock Alerts</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {inventoryAnalytics.lowStockItems}
                </h3>
                <div className="mt-2 text-xs text-amber-600 font-bold bg-amber-50 inline-block px-2 py-1 rounded">
                  Need attention
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Out of Stock</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {inventoryAnalytics.outOfStockItems}
                </h3>
                <div className="mt-2 text-xs text-rose-600 font-bold bg-rose-50 inline-block px-2 py-1 rounded">
                  Critical items
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ABC Analysis */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 break-inside-avoid">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart3 size={20} className="text-teal-600" /> ABC Analysis
                </h4>
                <p className="text-sm text-slate-500 mb-4">Product classification by value contribution</p>
                <div className="space-y-3">
                  {inventoryAnalytics.abcAnalysis.slice(0, 8).map((item: any, index: number) => (
                    <div key={item.productId} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          item.abcClass === 'A' ? 'bg-green-100 text-green-700' :
                          item.abcClass === 'B' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {item.abcClass}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.quantity} units</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">{(item.value / 1000).toFixed(0)}K TZS</p>
                        <p className="text-xs text-slate-500">{item.cumulativePercent.toFixed(1)}% cumulative</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock Turnover Analysis */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 break-inside-avoid">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-purple-600" /> Stock Turnover Analysis
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-2xl font-bold text-green-700">{inventoryAnalytics.turnoverAnalysis.fastMoving}</p>
                      <p className="text-xs text-green-600">Fast Moving</p>
                      <p className="text-xs text-slate-500">6 turns/year</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-2xl font-bold text-blue-700">{inventoryAnalytics.productAnalytics.length - inventoryAnalytics.turnoverAnalysis.fastMoving - inventoryAnalytics.turnoverAnalysis.slowMoving}</p>
                      <p className="text-xs text-blue-600">Normal</p>
                      <p className="text-xs text-slate-500">2-6 turns/year</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-2xl font-bold text-red-700">{inventoryAnalytics.turnoverAnalysis.slowMoving}</p>
                      <p className="text-xs text-red-600">Slow Moving</p>
                      <p className="text-xs text-slate-500">2 turns/year</p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Average Turnover Rate</span>
                      <span className="text-lg font-bold text-slate-800">{inventoryAnalytics.turnoverAnalysis.averageTurnover.toFixed(1)} turns/year</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Products by Value */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 break-inside-avoid">
              <h4 className="font-bold text-slate-800 mb-4">Top Products by Inventory Value</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600">Product</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Category</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-center">Stock</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-center">Value</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-center">Margin</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-center">ABC Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryAnalytics.abcAnalysis.slice(0, 10).map((item: any) => (
                      <tr key={item.productId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-slate-600">{item.category}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{(item.value / 1000).toFixed(0)}K TZS</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            item.margin > 50 ? 'bg-green-100 text-green-700' :
                            item.margin > 30 ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {item.margin.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            item.abcClass === 'A' ? 'bg-green-100 text-green-700' :
                            item.abcClass === 'B' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {item.abcClass}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Real-time Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Active Users</p>
                    <h3 className="text-3xl font-bold text-slate-800">{realTimeData.activeUsers}</h3>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Activity size={24} className="text-green-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-green-600 font-bold bg-green-50 inline-block px-2 py-1 rounded">
                  Live • {lastUpdate.toLocaleTimeString()}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Pending Approvals</p>
                    <h3 className="text-3xl font-bold text-slate-800">{realTimeData.pendingApprovals}</h3>
                  </div>
                  <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <AlertTriangle size={24} className="text-amber-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-amber-600 font-bold bg-amber-50 inline-block px-2 py-1 rounded">
                  Requires Attention
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">System Alerts</p>
                    <h3 className="text-3xl font-bold text-slate-800">{realTimeData.systemAlerts}</h3>
                  </div>
                  <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                    <ShieldAlert size={24} className="text-red-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-red-600 font-bold bg-red-50 inline-block px-2 py-1 rounded">
                  Last 24h
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Recent Transactions</p>
                    <h3 className="text-3xl font-bold text-slate-800">{realTimeData.recentTransactions}</h3>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <TrendingUp size={24} className="text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-blue-600 font-bold bg-blue-50 inline-block px-2 py-1 rounded">
                  Today
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Activity size={20} className="text-teal-600" />
                    Live Activity Feed
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live Updates
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-1">Real-time system activity from the last 24 hours</p>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {activityFeed.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Activity size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activityFeed.map((activity, index) => (
                      <div key={activity.id || index} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            activity.type === 'create' ? 'bg-green-100 text-green-600' :
                            activity.type === 'update' ? 'bg-blue-100 text-blue-600' :
                            activity.type === 'delete' ? 'bg-red-100 text-red-600' :
                            activity.type === 'approve' ? 'bg-purple-100 text-purple-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {activity.type === 'create' && <Plus size={16} />}
                            {activity.type === 'update' && <TrendingUp size={16} />}
                            {activity.type === 'delete' && <X size={16} />}
                            {activity.type === 'approve' && <CheckCircle size={16} />}
                            {activity.type === 'info' && <Activity size={16} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-medium text-slate-900 text-sm">{activity.title}</h5>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                activity.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                activity.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {activity.severity}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{activity.description}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {activity.user}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building size={12} />
                                {activity.branch}
                              </span>
                              <span>{new Date(activity.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Last updated: {lastUpdate.toLocaleTimeString()}</span>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                  >
                    <Activity size={14} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT TAB */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex gap-4 no-print">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <Calendar size={16} /> Last 30 Days
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4">Branch</th>
                    <th className="px-6 py-4">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                        No logs found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {log.userName}
                          <span className="block text-xs text-slate-400 font-normal">{log.userId}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700 text-xs">{log.action}</td>
                        <td className="px-6 py-4 text-slate-600">{log.details}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {branches.find(b => b.id === log.branchId)?.name || log.branchId}
                        </td>
                        <td className="px-6 py-4">
                          {log.severity === 'CRITICAL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-100 text-rose-700 text-xs font-bold">
                              <ShieldAlert size={12} /> CRITICAL
                            </span>
                          )}
                          {log.severity === 'WARNING' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold">
                              <AlertTriangle size={12} /> WARNING
                            </span>
                          )}
                          {log.severity === 'INFO' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold">
                              <CheckCircle size={12} /> INFO
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;







