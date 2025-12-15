import React, { useState, useEffect } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Finance from './components/Finance';
import Branches from './components/Branches';
import Staff from './components/Staff';
import Clinical from './components/Clinical';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Approvals from './components/Approvals';
import Archive from './components/Archive';
import { NotificationProvider, NotificationContainer, useNotifications } from './components/NotificationContext';
import { Staff as StaffType, UserRole, BranchInventoryItem, StockTransfer, Sale, Invoice, CartItem, PaymentMethod, StockReleaseRequest, StockRequisition, DisposalRequest, Expense, Branch, Product, SystemSetting } from './types';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const [currentUser, setCurrentUser] = useState<StaffType | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentBranchId, setCurrentBranchId] = useState('HEAD_OFFICE');
  const [isLoading, setIsLoading] = useState(false); // ✅ CHANGED: Start as false, not true

  // Global State for Data Consistency
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<Record<string, BranchInventoryItem[]>>({});
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [disposalRequests, setDisposalRequests] = useState<DisposalRequest[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<StaffType[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);

  // ✅ NEW: Check if user was previously logged in (from localStorage) and validate token
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('authToken');

        if (savedUser && savedToken) {
          // Validate token by making a test API call
          try {
            await api.getProducts(); // Test with a protected endpoint
            const user = JSON.parse(savedUser);
            setCurrentUser(user);
            setCurrentBranchId(user.branchId || 'HEAD_OFFICE');
            // Load data after setting user
            loadData();
          } catch (error) {
            // Token is invalid, clear session
            console.error('Token validation failed:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
          }
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
      }
    };

    checkAuth();
  }, []);

  // ✅ NEW: Separate function to load data (only call AFTER login)
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load branches first
      const branchesData = await api.getBranches();
      setBranches(branchesData);

      // Load inventory data with pricing for all branches
      const inventoryData = await loadInventoryData(branchesData);

      // Load remaining data in parallel
      const [productsData, staffData, transfersData, invoicesData, expensesData, disposalData, settingsData] = await Promise.all([
        api.getProducts(),
        api.getStaff(),
        api.getTransfers(),
        api.getInvoices(),
        api.getExpenses(),
        api.getDisposalRequests(),
        api.getSettings()
      ]);

      setProducts(productsData);
      setStaffList(staffData); // ✅ FIXED: Was setStaff, should be setStaffList
      setTransfers(transfersData);
      setInvoices(invoicesData);
      setExpenses(expensesData);
      setDisposalRequests(disposalData);
      setSettings(settingsData);
      setInventory(inventoryData);
    } catch (error) {
      console.error('Failed to load data:', error);
      showError('Data Load Error', 'Could not load system data from database');
    } finally {
      setIsLoading(false);
    }
  };

  // Load inventory data with pricing for all branches
  const loadInventoryData = async (branchesData: Branch[]) => {
    const inventoryMap: Record<string, BranchInventoryItem[]> = {};

    // Load inventory for each branch to get pricing data
    for (const branch of branchesData) {
      try {
        const branchInventory = await api.getBranchInventory(branch.id);
        inventoryMap[branch.id] = branchInventory;
      } catch (error) {
        console.error(`Failed to load inventory for branch ${branch.id}:`, error);
        inventoryMap[branch.id] = [];
      }
    }

    return inventoryMap;
  };

  // Automatic Expiry Check - Creates Disposal Requests
  useEffect(() => {
    if (Object.keys(inventory).length === 0 || products.length === 0) return;

    const checkExpiry = () => {
      const today = new Date().toISOString().split('T')[0];
      let hasUpdates = false;
      const updatedInventory = { ...inventory };
      const newDisposalRequests: DisposalRequest[] = [];

      Object.keys(updatedInventory).forEach(branchId => {
        updatedInventory[branchId] = updatedInventory[branchId].map(item => {
          let itemUpdated = false;
          const updatedBatches = item.batches.map(batch => {
              if (batch.expiryDate < today && batch.status === 'ACTIVE') {
                  hasUpdates = true;
                  itemUpdated = true;

                  // Create disposal request for expired batch
                  const product = products.find(p => p.id === item.productId);
                  if (product) {
                    const disposalRequest: DisposalRequest = {
                      id: `DISPOSAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      branchId: branchId,
                      requestedBy: 'SYSTEM', // Auto-generated by system
                      date: today,
                      status: 'PENDING',
                      items: [{
                        productId: item.productId,
                        productName: product.name,
                        batchNumber: batch.batchNumber,
                        quantity: batch.quantity,
                        reason: 'Expired Stock'
                      }]
                    };
                    newDisposalRequests.push(disposalRequest);
                  }

                  return { ...batch, status: 'EXPIRED' as const };
              }
              return batch;
          });
          return itemUpdated ? { ...item, batches: updatedBatches } : item;
        });
      });

      if (hasUpdates) {
          setInventory(updatedInventory);
      }

      // Add new disposal requests if any were created
      if (newDisposalRequests.length > 0) {
          setDisposalRequests(prev => [...prev, ...newDisposalRequests]);

          // Show notification about expired stock
          showWarning('Expired Stock Alert',
            `${newDisposalRequests.length} batch(es) have expired and are pending disposal approval.`
          );
      }
    };

    checkExpiry();
  }, [inventory, products]);

  // ✅ UPDATED: Handle Login and Load Data
  const handleLogin = async (user: StaffType, token?: string) => {
    setCurrentUser(user);

    // Save to localStorage for persistence
    localStorage.setItem('user', JSON.stringify(user));
    if (token) {
      localStorage.setItem('authToken', token); // Save the actual JWT token
    }

    if (user.role === UserRole.SUPER_ADMIN) {
        setCurrentBranchId('HEAD_OFFICE');
    } else {
        setCurrentBranchId(user.branchId);
    }

    // Load data after login
    await loadData();

    // Set active tab based on role
    if (user.role === UserRole.CASHIER) setActiveTab('pos');
    else if (user.role === UserRole.PHARMACIST) setActiveTab('clinical');
    else if (user.role === UserRole.ACCOUNTANT) setActiveTab('finance');
    else setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    setProducts([]);
    setInventory({});
    setTransfers([]);
    setSales([]);
    setInvoices([]);
    setExpenses([]);
    setDisposalRequests([]);
    setBranches([]);
    setStaffList([]);
    setSettings([]);

    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  };

  // --- PERSISTENCE HANDLERS ---

  const handleAddProduct = async (newProduct: Product) => {
      setProducts(prev => [...prev, newProduct]);
      try {
          await api.createProduct(newProduct);
          showSuccess('Product Added', `${newProduct.name} has been added successfully.`);
      } catch (error) {
          console.error('Failed to add product:', error);
          setProducts(prev => prev.filter(p => p.id !== newProduct.id));
          showError('Failed to Save Product', 'Product was not saved to database. Please try again.');
          throw error;
      }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
      const previousProducts = products;
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));

      try {
          await api.updateProduct(updatedProduct.id, {
              name: updatedProduct.name,
              genericName: updatedProduct.genericName,
              category: updatedProduct.category,
              costPrice: updatedProduct.costPrice,
              price: updatedProduct.price,
              unit: updatedProduct.unit,
              minStockLevel: updatedProduct.minStockLevel,
              requiresPrescription: updatedProduct.requiresPrescription
          });
          showSuccess('Product Updated', `${updatedProduct.name} has been updated successfully.`);
      } catch (error) {
          console.error('Failed to update product:', error);
          setProducts(previousProducts);
          showError('Failed to Update Product', 'Product changes were not saved to database. Please try again.');
          throw error;
      }
  };

  const handleAddStock = async (data: { branchId: string, productId: string, batchNumber: string, expiryDate: string, quantity: number }) => {
      const previousInventory = inventory;
      setInventory(prev => {
         const branchInventory = [...(prev[data.branchId] || [])];
         const existingItemIndex = branchInventory.findIndex(i => i.productId === data.productId);

         const newBatch = {
             batchNumber: data.batchNumber,
             expiryDate: data.expiryDate,
             quantity: data.quantity,
             status: 'ACTIVE' as const
         };

         if (existingItemIndex >= 0) {
             branchInventory[existingItemIndex].batches.push(newBatch);
             branchInventory[existingItemIndex].quantity += data.quantity;
         } else {
             branchInventory.push({
                 productId: data.productId,
                 quantity: data.quantity,
                 batches: [newBatch]
             });
         }
         return { ...prev, [data.branchId]: branchInventory };
      });

      try {
             await api.addStock(data);
             showSuccess('Stock Added', `${data.quantity} units added to inventory.`);
       } catch (error) {
          console.error('Failed to add stock:', error);
          setInventory(previousInventory);
          throw error;
      }
  };

  const handleCreateInvoice = async (newInvoice: Invoice) => {
    try {
      await api.createInvoice(newInvoice);
      setInvoices(prev => [newInvoice, ...prev]);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      throw error;
    }
  };

  const handleCreateTransfer = async (newTransfer: StockTransfer) => {
    setTransfers(prev => [newTransfer, ...prev]);

    try {
      await api.createTransfer(newTransfer);
    } catch (error) {
      console.error('Failed to create transfer:', error);
      setTransfers(prev => prev.filter(t => t.id !== newTransfer.id));
      throw error;
    }
  };

  const handleInvoicePayment = async (updatedInvoice: Invoice) => {
      // Check if invoice is already paid to prevent duplicate processing
      const existingInvoice = invoices.find(inv => inv.id === updatedInvoice.id);
      if (existingInvoice?.status === 'PAID') {
          console.warn('Invoice already paid, skipping duplicate processing', updatedInvoice.id);
          return;
      }

      const paymentMethod = updatedInvoice.payments[updatedInvoice.payments.length - 1]?.method;
      setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? { ...updatedInvoice, paymentMethod } : inv));

      if (updatedInvoice.status === 'PAID' && updatedInvoice.items && updatedInvoice.items.length > 0) {
          const branchId = updatedInvoice.branchId;

          setInventory(prev => {
            const branchStock = [...(prev[branchId] || [])];

            updatedInvoice.items?.forEach(cartItem => {
                const index = branchStock.findIndex(i => i.productId === cartItem.id);
                if (index !== -1) {
                    branchStock[index].quantity = Math.max(0, branchStock[index].quantity - cartItem.quantity);

                    let remainingToDeduct = cartItem.quantity;
                    const updatedBatches = branchStock[index].batches.map(batch => {
                         if (remainingToDeduct <= 0 || batch.status !== 'ACTIVE') return batch;

                         if (batch.quantity >= remainingToDeduct) {
                             const newBatchQty = batch.quantity - remainingToDeduct;
                             remainingToDeduct = 0;
                             return { ...batch, quantity: newBatchQty };
                         } else {
                             remainingToDeduct -= batch.quantity;
                             return { ...batch, quantity: 0 };
                         }
                    }).filter(b => b.quantity > 0);

                    branchStock[index].batches = updatedBatches;
                }
            });

            return { ...prev, [branchId]: branchStock };
        });

        const itemsToRecord: CartItem[] = updatedInvoice.items || [];
        const saleRecord: Sale = {
            id: `SALE-${updatedInvoice.id}`,
            date: new Date().toISOString(),
            branchId: updatedInvoice.branchId,
            items: itemsToRecord,
            totalAmount: updatedInvoice.totalAmount,
            totalCost: itemsToRecord.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0),
            profit: updatedInvoice.totalAmount - itemsToRecord.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0),
            paymentMethod: updatedInvoice.payments[updatedInvoice.payments.length - 1]?.method || PaymentMethod.CASH,
            customerName: updatedInvoice.customerName,
            status: 'COMPLETED'
        };

        try {
            await api.createSale(saleRecord);
            setSales(prev => [saleRecord, ...prev]);

        } catch (error) {
            console.error('Failed to record sale/payment:', error);
            showError('Warning', 'Sale recorded locally but may not be synced to backend. Please check inventory manually.');
        }
      }

      try {
          const updatedInvoices = await api.getInvoices();
          setInvoices(updatedInvoices);
      } catch (error) {
          console.error('Failed to refresh invoice data:', error);
      }
  };

  const handleCreateExpense = (exp: Expense) => {
      setExpenses(prev => [exp, ...prev]);
      api.createExpense(exp);
  };

  const handleExpenseAction = async (id: number, action: 'Approved' | 'Rejected') => {
      const previousExpenses = expenses;
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: action } : e));

      try {
          await api.updateExpense(String(id), { status: action });
          showSuccess('Expense Updated', `Expense has been ${action.toLowerCase()} successfully.`);
      } catch (error) {
          console.error('Failed to update expense:', error);
          setExpenses(previousExpenses);
          showError('Update Failed', 'There was an error updating the expense. Please try again.');
      }
  };

  const handleDisposalAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
      const previousDisposals = disposalRequests;
      setDisposalRequests(prev => prev.map(d => d.id === id ? { ...d, status: action } : d));

      try {
          await api.approveDisposalRequest(id);
          showSuccess('Disposal Request Updated', `Disposal request has been ${action.toLowerCase()} successfully.`);

          // If approved, update inventory to remove the disposed stock
          if (action === 'APPROVED') {
              const disposal = disposalRequests.find(d => d.id === id);
              if (disposal) {
                  setInventory(prev => {
                      const updatedInventory = { ...prev };
                      disposal.items.forEach(item => {
                          if (updatedInventory[disposal.branchId]) {
                              updatedInventory[disposal.branchId] = updatedInventory[disposal.branchId].map(invItem => {
                                  if (invItem.productId === item.productId) {
                                      // Remove the disposed batch
                                      const updatedBatches = invItem.batches.filter(batch =>
                                          batch.batchNumber !== item.batchNumber
                                      );
                                      return { ...invItem, batches: updatedBatches, quantity: updatedBatches.reduce((sum, b) => sum + b.quantity, 0) };
                                  }
                                  return invItem;
                              }).filter(invItem => invItem.quantity > 0); // Remove items with no stock
                          }
                      });
                      return updatedInventory;
                  });
              }
          }
      } catch (error) {
          console.error('Failed to update disposal request:', error);
          setDisposalRequests(previousDisposals);
          showError('Update Failed', 'There was an error updating the disposal request. Please try again.');
      }
  };

  const handleAddStaff = async (newStaff: StaffType) => {
      setStaffList(prev => [newStaff, ...prev]);
      try {
          await api.createStaff(newStaff);
          showSuccess('Staff Added', `${newStaff.name} has been added successfully.`);
      } catch (error) {
          console.error('Failed to add staff:', error);
          setStaffList(prev => prev.filter(s => s.id !== newStaff.id));
          showError('Failed to Add Staff', 'Staff member was not saved to database. Please try again.');
          throw error;
      }
  };

  const handleAddBranch = async (newBranch: Branch) => {
      setBranches(prev => [...prev, newBranch]);
      try {
          await api.request('/branches', {
              method: 'POST',
              body: JSON.stringify(newBranch)
          });
      } catch (error) {
          console.error('Failed to add branch:', error);
          setBranches(prev => prev.filter(b => b.id !== newBranch.id));
          throw error;
      }
  };

  const handleUpdateStaff = async (updatedStaff: StaffType) => {
      const previousStaffList = staffList;
      setStaffList(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));

      try {
          await api.updateStaff(updatedStaff.id, {
              name: updatedStaff.name,
              role: updatedStaff.role,
              branchId: updatedStaff.branchId,
              email: updatedStaff.email,
              phone: updatedStaff.phone,
              status: updatedStaff.status,
              password: updatedStaff.password
          });

          const updatedBranches = await api.getBranches();
          setBranches(updatedBranches);

          showSuccess('Staff Updated', `${updatedStaff.name}'s information has been saved successfully.`);
      } catch (error) {
          console.error('Failed to update staff:', error);
          setStaffList(previousStaffList);
          showError('Update Failed', 'There was an error saving the staff changes. Please try again.');
          throw error;
      }
  };

  // --- ARCHIVE LOGIC ---
  const handleToggleArchive = (type: 'invoice' | 'expense', id: string | number) => {
      if (type === 'invoice') {
          const inv = invoices.find(i => i.id === id);
          if (inv) {
              const newVal = !inv.archived;
              setInvoices(prev => prev.map(i => i.id === id ? { ...i, archived: newVal } : i));
              api.request(`/${type}/${id}/archive`, {
                  method: 'PATCH',
                  body: JSON.stringify({ archived: newVal })
              });
          }
      } else {
          const exp = expenses.find(e => e.id === id);
          if (exp) {
              const newVal = !exp.archived;
              setExpenses(prev => prev.map(e => e.id === id ? { ...e, archived: newVal } : e));
              api.request(`/${type}/${id}/archive`, {
                  method: 'PATCH',
                  body: JSON.stringify({ archived: newVal })
              });
          }
      }
  };

  const handleAutoArchive = (months: number) => {
      const thresholdDate = new Date();
      thresholdDate.setMonth(thresholdDate.getMonth() - months);
      const thresholdStr = thresholdDate.toISOString().split('T')[0];
      let count = 0;

      setInvoices(prev => prev.map(inv => {
          if (inv.status === 'PAID' && inv.dateIssued < thresholdStr && !inv.archived) {
              count++;
              api.request(`/invoice/${inv.id}/archive`, {
                  method: 'PATCH',
                  body: JSON.stringify({ archived: true })
              });
              return { ...inv, archived: true };
          }
          return inv;
      }));

      setExpenses(prev => prev.map(exp => {
          if (['Approved', 'Rejected'].includes(exp.status) && exp.date < thresholdStr && !exp.archived) {
              count++;
              api.request(`/expense/${exp.id}/archive`, {
                  method: 'PATCH',
                  body: JSON.stringify({ archived: true })
              });
              return { ...exp, archived: true };
          }
          return exp;
      }));

      showSuccess('Auto-Archive Complete', `${count} items have been moved to archive.`);
  };

  // ✅ Show Login if no user
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Show loading while fetching data after login
  if (isLoading) {
      return (
          <div className="h-screen flex items-center justify-center bg-slate-900 text-white flex-col">
              <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Loading PMS Data...</p>
          </div>
      )
  }

  const usersBranch = branches.find(b => b.id === currentUser.branchId);
  if (currentUser.role !== UserRole.SUPER_ADMIN && usersBranch?.status === 'INACTIVE') {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border border-slate-200">
                  <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
                  <div className="flex items-center justify-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-lg mb-4">
                       <AlertTriangle size={18} />
                       <span className="font-bold">Branch Inactive</span>
                  </div>
                  <p className="text-slate-500 mb-8">
                      The branch <strong>{usersBranch.name}</strong> has been deactivated.
                  </p>
                  <button 
                    onClick={handleLogout} 
                    className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors"
                  >
                      Return to Login
                  </button>
              </div>
          </div>
      );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard currentBranchId={currentBranchId} inventory={inventory} sales={sales} expenses={expenses} onViewInventory={() => setActiveTab('inventory')} />;
      case 'approvals':
          return <Approvals
            releaseRequests={[]}
            onApproveRelease={() => {}}
            requisitions={[]}
            onActionRequisition={() => {}}
            disposalRequests={disposalRequests}
            onApproveDisposal={handleDisposalAction}
            expenses={expenses}
            onActionExpense={handleExpenseAction}
            transfers={transfers}
            onApproveTransfer={() => {}}
          />;
      case 'pos':
        return <POS currentBranchId={currentBranchId} inventory={inventory} onCreateInvoice={handleCreateInvoice} products={products} />;
      case 'inventory':
        return (
            <Inventory
                currentBranchId={currentBranchId}
                inventory={inventory}
                setInventory={setInventory}
                transfers={transfers}
                setTransfers={setTransfers}
                sales={sales}
                currentUser={currentUser}
                products={products}
                setProducts={setProducts}
                branches={branches}
                onAddStock={handleAddStock}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onCreateTransfer={handleCreateTransfer}
            />
        );
      case 'finance':
        return (
            <Finance
                currentBranchId={currentBranchId}
                invoices={invoices.filter(i => !i.archived)}
                expenses={expenses.filter(e => !e.archived)}
                sales={sales}
                onProcessPayment={handleInvoicePayment}
                onCreateExpense={handleCreateExpense}
                onArchiveItem={(type, id) => handleToggleArchive(type, id)}
                branches={branches}
                settings={settings}
            />
        );
      case 'staff':
        return <Staff currentBranchId={currentBranchId} branches={branches} staffList={staffList} onAddStaff={handleAddStaff} onUpdateStaff={handleUpdateStaff} />;
      case 'branches':
        return <Branches branches={branches} onUpdateBranches={setBranches} onAddBranch={handleAddBranch} staff={staffList} currentUser={currentUser} />;
      case 'clinical':
        return <Clinical currentBranchId={currentBranchId} />;
      case 'reports':
        return <Reports currentBranchId={currentBranchId} inventory={inventory} sales={sales} expenses={expenses} />;
      case 'archive':
        return (
            <Archive 
                currentBranchId={currentBranchId} 
                invoices={invoices} 
                expenses={expenses}
                onRestore={(type, id) => handleToggleArchive(type, id)}
                onAutoArchive={handleAutoArchive}
            />
        );
      case 'settings':
        return (
          <Settings 
            currentBranchId={currentBranchId} 
            inventory={inventory}
            sales={sales}
            expenses={expenses}
            invoices={invoices}
          />
        );
      default:
        return <Dashboard currentBranchId={currentBranchId} inventory={inventory} sales={sales} expenses={expenses} onViewInventory={() => setActiveTab('inventory')} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentBranchId={currentBranchId}
      setCurrentBranchId={setCurrentBranchId}
      currentUser={currentUser}
      onLogout={handleLogout}
      branches={branches}
    >
      {renderContent()}
      <NotificationContainer />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
};

export default App;