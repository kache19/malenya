import {
  Branch,
  Staff,
  BranchInventoryItem,
  Sale,
  Invoice,
  Expense,
  StockTransfer,
  Product,
  Patient,
  Prescription,
  SystemSetting,
  AuditLog,
  CartItem,
  PaymentMethod
} from '../types';

const API_URL = 'http://localhost/Malenya/PMS/backend/index.php/api/';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Enhanced fetch with timeout, error handling, and automatic retry
 */
async function fetchJSON(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const method = options.method || 'GET';
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const opts: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  // Add timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  opts.signal = controller.signal;

  try {
    const res = await fetch(url, opts);
    clearTimeout(timeoutId);

    // Handle 204 No Content
    if (res.status === 204) {
      return null;
    }

    // Handle 401 Unauthorized - redirect to login
    if (res.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Unauthorized. Please login again.');
    }

    // Handle other errors
    if (!res.ok) {
      let errorMessage = `${res.status} ${res.statusText}`;
      try {
        const errorBody = await res.json();
        errorMessage = errorBody.message || errorMessage;
      } catch {
        const textBody = await res.text().catch(() => '');
        if (textBody) errorMessage = textBody;
      }

      throw new Error(`${method} ${path} failed: ${errorMessage}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection and try again.');
    }

    // Handle abort/timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timeout. ${method} ${path} took too long.`);
    }

    throw error;
  }
}

/**
 * Login user and store auth token
 */
export const login = async (username: string, password: string) => {
  return fetchJSON('auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
};

/**
 * Logout user and clear auth
 */
function logout(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

/**
 * Get current authenticated user
 */
function getCurrentUser(): Staff | null {
  try {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
function isAuthenticated(): boolean {
  return !!localStorage.getItem('authToken');
}

export const api = {
  // Auth
  login,
  logout,
  getCurrentUser,
  isAuthenticated,

  // Products
  getProducts: (): Promise<Product[]> =>
    fetchJSON('products').catch(() => []),

  getProduct: (id: string): Promise<Product | null> =>
    fetchJSON(`products/${id}`).catch(() => null),

  createProduct: (payload: Partial<Product>): Promise<Product> =>
    fetchJSON('products', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  bulkImportProducts: (products: Partial<Product>[]): Promise<{
    message: string;
    results: {
      total: number;
      successful: number;
      failed: number;
      successDetails: Array<{ index: number; id: string; name: string }>;
      failures: Array<{ index: number; name: string; reason: string }>;
    }
  }> =>
    fetchJSON('products/bulk', {
      method: 'POST',
      body: JSON.stringify({ products })
    }),

  updateProduct: (id: string, payload: Partial<Product>): Promise<Product> =>
    fetchJSON(`products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteProduct: (id: string): Promise<void> =>
    fetchJSON(`products/${id}`, { method: 'DELETE' }),

  clearAllProducts: (): Promise<{ message: string; deletedCount: number }> =>
    fetchJSON('products', { method: 'DELETE' }),

  // Branches
  getBranches: (): Promise<Branch[]> =>
    fetchJSON('branches').catch(() => []),

  getBranch: (id: string): Promise<Branch | null> =>
    fetchJSON(`branches/${id}`).catch(() => null),

  createBranch: (payload: Partial<Branch>): Promise<Branch> =>
    fetchJSON('branches', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateBranch: (id: string, payload: Partial<Branch>): Promise<Branch> =>
    fetchJSON(`branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  // Inventory
   getInventory: (branchId?: string): Promise<Record<string, BranchInventoryItem[]>> =>
     fetchJSON(`inventory${branchId ? `?branchId=${branchId}` : ''}`).catch(() => ({})),

   getBranchInventory: (branchId: string): Promise<BranchInventoryItem[]> =>
     fetchJSON(`inventory/${branchId}`).catch(() => []),

   getInventoryItem: (branchId: string, productId: string): Promise<BranchInventoryItem | null> =>
     fetchJSON(`inventory/${branchId}/${productId}`).catch(() => null),

   updateInventoryItem: (branchId: string, productId: string, payload: Partial<BranchInventoryItem>): Promise<BranchInventoryItem> =>
     fetchJSON(`inventory/${branchId}/${productId}`, {
       method: 'PUT',
       body: JSON.stringify(payload)
     }),

   addInventoryBatch: (branchId: string, productId: string, batch: any): Promise<BranchInventoryItem> =>
     fetchJSON(`inventory/${branchId}/${productId}/batches`, {
       method: 'POST',
       body: JSON.stringify(batch)
     }),

  // Transfers
   getTransfers: (): Promise<StockTransfer[]> =>
     fetchJSON('inventory/transfers').catch(() => []),

   getTransfer: (id: string): Promise<StockTransfer | null> =>
     fetchJSON(`inventory/transfers/${id}`).catch(() => null),

   createTransfer: (payload: Partial<StockTransfer>): Promise<StockTransfer> =>
     fetchJSON('inventory/transfers', {
       method: 'POST',
       body: JSON.stringify(payload)
     }),

   updateTransfer: (id: string, payload: Partial<StockTransfer>): Promise<StockTransfer> =>
     fetchJSON(`inventory/transfers/${id}`, {
       method: 'PUT',
       body: JSON.stringify(payload)
     }),

   approveTransfer: (id: string): Promise<StockTransfer> =>
     fetchJSON(`inventory/transfers/${id}/approve`, { method: 'POST' }),

  // Sales
  getSales: (): Promise<Sale[]> =>
    fetchJSON('sales').catch(() => []),

  getSale: (id: string): Promise<Sale | null> =>
    fetchJSON(`sales/${id}`).catch(() => null),

  createSale: (payload: Partial<Sale>): Promise<Sale> =>
    fetchJSON('sales', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Invoices
  getInvoices: (): Promise<Invoice[]> =>
    fetchJSON('finance/invoices').catch(() => []),

  getInvoice: (id: string): Promise<Invoice | null> =>
    fetchJSON(`finance/invoices/${id}`).catch(() => null),

  createInvoice: (payload: Partial<Invoice>): Promise<Invoice> =>
    fetchJSON('finance/invoices', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateInvoice: (id: string, payload: Partial<Invoice>): Promise<Invoice> =>
    fetchJSON(`finance/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  recordPayment: (invoiceId: string, payment: any): Promise<Invoice> =>
    fetchJSON(`finance/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment)
    }),

  // Expenses
  getExpenses: (): Promise<Expense[]> =>
    fetchJSON('expenses').catch(() => []),

  getExpense: (id: string): Promise<Expense | null> =>
    fetchJSON(`expenses/${id}`).catch(() => null),

  createExpense: (payload: Partial<Expense>): Promise<Expense> =>
    fetchJSON('expenses', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateExpense: (id: string, payload: Partial<Expense>): Promise<Expense> =>
    fetchJSON(`expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteExpense: (id: string): Promise<void> =>
    fetchJSON(`expenses/${id}`, { method: 'DELETE' }),

  // Staff
  getStaff: (): Promise<Staff[]> =>
    fetchJSON('staff').catch(() => []),

  getStaffMember: (id: string): Promise<Staff | null> =>
    fetchJSON(`staff/${id}`).catch(() => null),

  createStaff: (payload: Partial<Staff>): Promise<Staff> =>
    fetchJSON('staff', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateStaff: (id: string, payload: Partial<Staff>): Promise<Staff> =>
    fetchJSON(`staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteStaff: (id: string): Promise<void> =>
    fetchJSON(`staff/${id}`, { method: 'DELETE' }),

  // Patients
  getPatients: (): Promise<Patient[]> =>
    fetchJSON('patients').catch(() => []),

  getPatient: (id: string): Promise<Patient | null> =>
    fetchJSON(`patients/${id}`).catch(() => null),

  createPatient: (payload: Partial<Patient>): Promise<Patient> =>
    fetchJSON('patients', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updatePatient: (id: string, payload: Partial<Patient>): Promise<Patient> =>
    fetchJSON(`patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  // Prescriptions
  getPrescriptions: (): Promise<Prescription[]> =>
    fetchJSON('prescriptions').catch(() => []),

  getPrescription: (id: string): Promise<Prescription | null> =>
    fetchJSON(`prescriptions/${id}`).catch(() => null),

  createPrescription: (payload: Partial<Prescription>): Promise<Prescription> =>
    fetchJSON('prescriptions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updatePrescription: (id: string, payload: Partial<Prescription>): Promise<Prescription> =>
    fetchJSON(`prescriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  // Settings
  getSettings: (): Promise<SystemSetting[]> =>
    fetchJSON('settings').catch(() => []),

  getSetting: (key: string): Promise<SystemSetting | null> =>
    fetchJSON(`settings/${key}`).catch(() => null),

  createSetting: (payload: Partial<SystemSetting>): Promise<SystemSetting> =>
    fetchJSON('settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateSetting: (id: string, value: any): Promise<SystemSetting> =>
    fetchJSON(`settings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    }),

  // Audit Logs
  getAuditLogs: (): Promise<AuditLog[]> =>
    fetchJSON('audit-logs').catch(() => []),

  getAuditLog: (id: string): Promise<AuditLog | null> =>
    fetchJSON(`audit-logs/${id}`).catch(() => null),

  // Sessions
  getSessions: (): Promise<any[]> =>
    fetchJSON('sessions').catch(() => []),

  revokeSession: (sessionId: string): Promise<void> =>
    fetchJSON(`sessions/${sessionId}/revoke`, { method: 'POST' }),

  // System
  getSystemHealth: (): Promise<any> =>
    fetchJSON('health').catch(() => ({})),

  factoryReset: (): Promise<void> =>
    fetchJSON('system/factory-reset', { method: 'POST' }),

  // Requisitions
  getRequisitions: (): Promise<any[]> =>
    fetchJSON('requisitions').catch(() => []),

  getRequisition: (id: string): Promise<any | null> =>
    fetchJSON(`requisitions/${id}`).catch(() => null),

  createRequisition: (payload: any): Promise<any> =>
    fetchJSON('requisitions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateRequisition: (id: string, payload: any): Promise<any> =>
    fetchJSON(`requisitions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  updateRequisitionStatus: (id: string, status: 'APPROVED' | 'REJECTED', approvedBy?: string): Promise<any> =>
    fetchJSON(`requisitions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, approvedBy })
    }),

  // Release Requests
  getReleaseRequests: (): Promise<any[]> =>
    fetchJSON('releases').catch(() => []),

  approveReleaseRequest: (id: string): Promise<any> =>
    fetchJSON(`releases/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'APPROVED' })
    }),

  // Disposal Requests
  getDisposalRequests: (): Promise<any[]> =>
    fetchJSON('disposals').catch(() => []),

  approveDisposalRequest: (id: string): Promise<any> =>
    fetchJSON(`disposals/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'APPROVED' })
    }),

  // Generic/Custom requests
   request: (path: string, options: RequestInit = {}): Promise<any> =>
     fetchJSON(path.startsWith('/') ? path.substring(1) : path, options),

  // Shipments
  getShipments: (): Promise<any[]> =>
    fetchJSON('shipments').catch(() => []),

  getShipment: (id: string): Promise<any | null> =>
    fetchJSON(`shipments/${id}`).catch(() => null),

  createShipment: (payload: any): Promise<any> =>
    fetchJSON('shipments', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateShipment: (id: string, payload: any): Promise<any> =>
    fetchJSON(`shipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  // Stock
  addStock: async (data: {
    branchId: string;
    productId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
  }) => {
    return fetchJSON('inventory/add', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

const handleInvoicePayment = async (
  updatedInvoice: Invoice,
  invoices: Invoice[],
  setInvoices: (callback: (prev: Invoice[]) => Invoice[]) => void,
  setInventory: (callback: (prev: Record<string, BranchInventoryItem[]>) => Record<string, BranchInventoryItem[]>) => void,
  setSales: (callback: (prev: Sale[]) => Sale[]) => void,
  showSuccess: (title: string, message: string) => void,
  showError: (title: string, message: string) => void
) => {
    // Check if invoice is already paid to prevent duplicate processing
    const existingInvoice = invoices.find(inv => inv.id === updatedInvoice.id);
    if (existingInvoice?.status === 'PAID') {
        console.warn('Invoice already paid, skipping duplicate processing', updatedInvoice.id);
        return;
    }

    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));

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
          // Create sale record with payment method
          await api.createSale(saleRecord);
          setSales(prev => [saleRecord, ...prev]);
          
          showSuccess('Invoice Paid', `Payment of ${updatedInvoice.totalAmount} TZS recorded via ${saleRecord.paymentMethod}.`);
      } catch (error) {
          console.error('Failed to record sale:', error);
          showError('Save Error', 'Sale record could not be saved. Please check your connection and try again.');
      }
    }

    try {
        const updatedInvoices = await api.getInvoices();
        setInvoices(() => updatedInvoices);
    } catch (error) {
        console.error('Failed to refresh invoice data:', error);
    }
  };