import React, { useMemo, useEffect, useState } from 'react';
import { 
  LineChart,
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { TrendingUp, AlertTriangle, DollarSign, Users, Store } from 'lucide-react';
import { api } from '../services/api';
import { BranchInventoryItem, Sale, Expense, Branch, Product } from '../types';

const COLORS = ['#0f766e', '#14b8a6', '#5eead4', '#ccfbf1'];

// Safely access properties for charts
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
      <span className="text-emerald-600 font-medium flex items-center">
        <TrendingUp size={14} className="mr-1" />
        {subtext}
      </span>
      <span className="text-slate-400 ml-2">vs last month</span>
    </div>
  </div>
);

interface DashboardProps {
  currentBranchId: string;
  inventory: Record<string, BranchInventoryItem[]>;
  sales: Sale[];
  expenses: Expense[];
  onViewInventory: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentBranchId, inventory, sales, expenses, onViewInventory }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [branchesData, productsData] = await Promise.all([
          api.getBranches(),
          api.getProducts()
        ]);
        if (mounted) {
          setBranches(branchesData || []);
          setProducts(productsData || []);
        }
      } catch (err) {
        console.error('Failed to load branches/products', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const isHeadOffice = currentBranchId === 'HEAD_OFFICE';
  const activeBranchName = branches.find(b => b.id === currentBranchId)?.name || 'Unknown';

  // DYNAMIC CALCULATIONS
  const dashboardStats = useMemo(() => {
      // 1. Filter Data by Branch
      const filteredSales = sales.filter(s => isHeadOffice || s.branchId === currentBranchId);
      const filteredExpenses = expenses.filter(e => isHeadOffice || e.branchId === currentBranchId);
      
      // 2. Calculate Totals
      const revenue = filteredSales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      const grossProfit = filteredSales.reduce((acc, curr) => acc + (curr.profit || 0), 0);
      const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const netProfit = grossProfit - totalExpenses;
      const transactions = filteredSales.length;

      return { revenue, netProfit, transactions };
  }, [sales, expenses, currentBranchId, isHeadOffice]);

  // DYNAMIC CHART DATA
  const chartData = useMemo(() => {
      const filteredSales = sales.filter(s => isHeadOffice || s.branchId === currentBranchId);
      
      // Group by Day (Last 7 Days)
      const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
      });

      return last7Days.map(dateStr => {
          const daySales = filteredSales.filter(s => s.date.startsWith(dateStr));
          const dailyRevenue = daySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
          const dailyCount = daySales.length;
          const dateObj = new Date(dateStr);
          return {
              name: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
              sales: dailyCount * 10, // scaling for visual if needed, or just use revenue
              revenue: dailyRevenue
          };
      });
  }, [sales, currentBranchId, isHeadOffice]);

  // BRANCH DISTRIBUTION DATA (For Head Office)
  const branchPerformance = useMemo(() => {
      if (!isHeadOffice) return [];
      const branchRevenueMap: Record<string, number> = {};
      sales.forEach(s => {
          if (s.branchId) {
            branchRevenueMap[s.branchId] = (branchRevenueMap[s.branchId] || 0) + (s.totalAmount || 0);
          }
      });

      return Object.entries(branchRevenueMap).map(([bId, val]) => ({
          name: branches.find(b => b.id === bId)?.name || bId,
          value: val
      }));
  }, [sales, isHeadOffice, branches]);


  // DYNAMIC STOCK ALERTS
  let lowStockCount = 0;
  const criticalItems: {name: string, stock: number, branch: string}[] = [];
  const branchesToCheck = isHeadOffice ? Object.keys(inventory) : [currentBranchId];
  
  branchesToCheck.forEach(bId => {
      const stockList = inventory[bId] || [];
      stockList.forEach(item => {
          const productDef = products.find(p => p.id === item.productId);
          // Calculate ACTIVE stock only
          const activeStock = item.batches ? item.batches.filter(b => b.status === 'ACTIVE').reduce((sum, b) => sum + b.quantity, 0) : 0;

          if (productDef && activeStock <= productDef.minStockLevel) {
              lowStockCount++;
              if (criticalItems.length < 5) {
                  criticalItems.push({
                      name: productDef.name,
                      stock: activeStock,
                      branch: branches.find(b => b.id === bId)?.name || bId
                  });
              }
          }
      });
  });


  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">{isHeadOffice ? 'Head Office Overview' : `${activeBranchName} Overview`}</h2>
        <p className="text-slate-500 mt-1">
          {isHeadOffice 
            ? 'Real-time aggregated insights across all branches.' 
            : `Monitoring performance for ${activeBranchName} only.`
          }
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue (All Time)" 
          value={`TZS ${(dashboardStats.revenue / 1000000).toFixed(2)}M`} 
          subtext="Dynamic" 
          icon={DollarSign} 
          color="bg-emerald-600" 
        />
        <StatCard 
          title="Transactions" 
          value={dashboardStats.transactions.toLocaleString()} 
          subtext="Processed" 
          icon={Users} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Stock Alerts" 
          value={`${lowStockCount} Items`} 
          subtext="Below Min Level" 
          icon={AlertTriangle} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Net Profit" 
          value={`TZS ${(dashboardStats.netProfit / 1000000).toFixed(2)}M`} 
          subtext="Rev - Cost - Exp" 
          icon={TrendingUp} 
          color="bg-teal-600" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">
             {isHeadOffice ? 'Global Sales Analytics (7 Days)' : 'Branch Sales Analytics (7 Days)'}
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${value/1000}k`} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f766e', fontWeight: 600 }}
                    formatter={(value: number) => [`TZS ${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0d9488" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Distribution (Only visible for Head Office) */}
        {isHeadOffice ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue by Branch</h3>
          <div className="h-60 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={branchPerformance}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {branchPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `TZS ${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className="text-3xl font-bold text-teal-800">{branchPerformance.length}</span>
                <p className="text-xs text-slate-500 uppercase">Branches</p>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {branchPerformance.map((branch, index) => (
              <div key={branch.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-slate-600">{branch.name}</span>
                </div>
                <span className="font-medium text-slate-900">{(branch.value / 1000000).toFixed(1)}M</span>
              </div>
            ))}
          </div>
        </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
             <div className="p-4 bg-teal-50 rounded-full mb-4">
               <Store size={40} className="text-teal-600" />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">{activeBranchName}</h3>
             <p className="text-slate-500 mb-6">Performance is solid. Keep monitoring stock levels.</p>
             <button onClick={onViewInventory} className="text-teal-600 font-bold hover:underline">Manage Stock</button>
          </div>
        )}
      </div>

      {/* Low Stock Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
             {isHeadOffice ? 'Critical Stock Alerts (Real-time)' : 'Branch Stock Alerts'}
          </h3>
          <button onClick={onViewInventory} className="text-teal-600 text-sm font-medium hover:underline">View All Inventory</button>
        </div>
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Product Name</th>
              <th className="px-6 py-4">Branch</th>
              <th className="px-6 py-4">Active Stock</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {criticalItems.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No low stock items detected.</td>
                </tr>
            ) : (
                criticalItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                      <td className="px-6 py-4">{item.branch}</td>
                      <td className="px-6 py-4 text-red-600 font-bold">{item.stock} Units</td>
                      <td className="px-6 py-4"><span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">LOW</span></td>
                      <td className="px-6 py-4 text-teal-600 hover:text-teal-800 cursor-pointer">Reorder</td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
