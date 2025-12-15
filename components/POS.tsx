import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  ShieldCheck,
  Printer,
  CheckCircle,
  AlertOctagon,
  Send,
  FileText,
  X,
  AlertTriangle,
  Eye,
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Product, CartItem, PaymentMethod, BranchInventoryItem, Invoice, Branch } from '../types';
import { checkDrugInteractions } from '../services/geminiService';
import { api } from '../services/api';
import { useNotifications } from './NotificationContext';

interface POSProps {
  currentBranchId: string;
  inventory: Record<string, BranchInventoryItem[]>;
  onCreateInvoice: (invoice: Invoice) => void;
  products: Product[];
}

const POS: React.FC<POSProps> = ({ currentBranchId, inventory, onCreateInvoice, products }) => {
  const { showSuccess, showError } = useNotifications();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickQty, setQuickQty] = useState<number>(1);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [interactionWarning, setInteractionWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductPanelCollapsed, setIsProductPanelCollapsed] = useState(false);

  // Load branches on mount
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const branchesData = await api.getBranches();
        setBranches(branchesData || []);
      } catch (error) {
        console.error('Failed to load branches:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBranches();
  }, []);

  const isHeadOffice = currentBranchId === 'HEAD_OFFICE';
  const branchName = branches.find(b => b.id === currentBranchId)?.name || 'Unknown Branch';

  // Merge Products with Branch Specific Inventory
  const availableProducts: Product[] = products.map(p => {
    const branchStockList = inventory[currentBranchId] || [];
    const inventoryItem = branchStockList.find(i => i.productId === p.id);
    const customPrice = inventoryItem?.customPrice;

    const activeStock = inventoryItem
      ? inventoryItem.batches.filter(b => b.status === 'ACTIVE').reduce((sum, b) => sum + b.quantity, 0)
      : 0;

    return {
      ...p,
      price: customPrice || p.price,
      totalStock: activeStock
    };
  });

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vat = subtotal * 0.18;
  const total = subtotal + vat;

  // Drug interaction check
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (cart.length > 1) {
        try {
          const warning = await checkDrugInteractions(cart);
          if (warning && warning.toLowerCase() !== "safe") {
            setInteractionWarning(warning);
          } else {
            setInteractionWarning(null);
          }
        } catch (error) {
          console.error('Drug interaction check failed:', error);
        }
      } else {
        setInteractionWarning(null);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [cart]);

  const addToCart = (product: Product) => {
    const qtyToAdd = quickQty > 0 ? quickQty : 1;
    const currentQtyInCart = cart.find(i => i.id === product.id)?.quantity || 0;

    if (currentQtyInCart + qtyToAdd > product.totalStock) {
      showError(
        'Insufficient Stock',
        `Available: ${product.totalStock}, Requested: ${currentQtyInCart + qtyToAdd}`
      );
      return;
    }

    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p =>
          p.id === product.id ? { ...p, quantity: p.quantity + qtyToAdd } : p
        );
      }
      return [...prev, { ...product, quantity: qtyToAdd, selectedBatch: 'BATCH-AUTO', discount: 0 }];
    });

    setQuickQty(1);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQty: number) => {
    if (isNaN(newQty) || newQty < 0) return;

    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;

      const product = availableProducts.find(p => p.id === id);
      if (!product) return prev;

      if (newQty > product.totalStock) {
        showError(
          'Insufficient Stock',
          `Limit is ${product.totalStock} units for ${product.name}`
        );
        return prev;
      }

      if (newQty === 0) return prev.filter(i => i.id !== id);

      return prev.map(p => p.id === id ? { ...p, quantity: newQty } : p);
    });
  };

  const handleGenerateProforma = async () => {
    if (!customerName.trim()) {
      showError('Validation Error', 'Please enter a customer name.');
      return;
    }

    const invoice: Invoice = {
      id: `INV-${Date.now().toString().slice(-6)}`,
      branchId: currentBranchId,
      customerName: customerName,
      dateIssued: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      totalAmount: total,
      paidAmount: 0,
      status: 'UNPAID',
      description: `POS Sale - ${cart.length} items`,
      source: 'POS',
      items: cart,
      payments: []
    };

    try {
      await onCreateInvoice(invoice);
      setCustomerModalOpen(false);
      setPreviewMode(false);
      showSuccess(
        'Invoice Created',
        `Proforma Invoice #${invoice.id} sent to Finance`
      );
      setCart([]);
      setCustomerName('');
    } catch (error) {
      console.error('Failed to create invoice:', error);
      showError('Creation Failed', 'Failed to create invoice. Please try again.');
    }
  };

  const handlePrintProforma = () => {
    window.print();
  };

  const filteredProducts = availableProducts.filter(p =>
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.genericName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    p.totalStock > 0
  );


  if (isHeadOffice) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-6 bg-amber-50 rounded-full mb-4">
          <AlertOctagon size={48} className="text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">POS Unavailable in Head Office View</h2>
        <p className="text-slate-500 max-w-md mb-6">
          Point of Sale operations must be conducted within a specific branch context. Please switch to a branch using the selector in the sidebar.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <ShoppingCart className="animate-spin mx-auto mb-4 text-teal-600" size={32} />
          <p>Loading POS system...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="h-full min-h-screen">
      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[calc(100vh-12rem)] no-print">
        {/* Product Selection */}
        <div className={`flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-0 transition-all duration-300 ${
          isProductPanelCollapsed ? 'w-16' : 'flex-1'
        }`}>
          <div className="p-4 border-b border-slate-100 flex gap-4 items-center">
            {!isProductPanelCollapsed && (
              <>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Scan Barcode or Search Product..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="w-32">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase">Qty:</span>
                    <input
                      type="number"
                      min="1"
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-center"
                      value={quickQty}
                      onChange={(e) => setQuickQty(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </>
            )}
            <button
              onClick={() => setIsProductPanelCollapsed(!isProductPanelCollapsed)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title={isProductPanelCollapsed ? "Expand product panel" : "Collapse product panel"}
            >
              {isProductPanelCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          {!isProductPanelCollapsed && (
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Search size={48} className="mb-4 opacity-20" />
                  <p>No products available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="flex flex-col text-left p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all group"
                    >
                      <div className="flex justify-between w-full mb-2">
                        <span className="text-xs font-bold text-teal-600 bg-teal-100 px-2 py-1 rounded-md">
                          {product.unit}
                        </span>
                        {product.requiresPrescription && (
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">Rx</span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1 group-hover:text-teal-700 text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3 line-clamp-1">{product.genericName}</p>
                      <div className="mt-auto pt-2 border-t border-slate-100 w-full flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">
                            {(product.price || 0).toLocaleString()} TZS
                          </span>
                          <span className="text-[10px] text-slate-400">Stock: {product.totalStock}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart & Checkout */}
        <div className={`flex flex-col bg-white rounded-2xl shadow-xl border border-slate-100 min-h-0 ${
          isProductPanelCollapsed ? 'flex-1' : 'w-96'
        }`}>
          <div className="p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <FileText className="mr-2" size={20} />
                Order
              </h2>
              <p className="text-xs text-teal-600 font-bold mt-1">Location: {branchName}</p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-slate-400 hover:text-rose-500"
                title="Clear Cart"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <ShoppingCart size={48} className="mb-4 opacity-50" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                      <p className="text-xs text-slate-500">{(item.price || 0).toLocaleString()} per unit</p>
                    </div>
                    <span className="font-bold text-slate-900">
                      {((item.price || 0) * item.quantity).toLocaleString()
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        className="w-12 text-center text-sm font-bold border-none focus:ring-0 p-0"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-400 hover:text-red-600 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* AI Warning Section */}
          {interactionWarning && (
            <div className="px-6 py-3 bg-amber-50 border-t border-amber-100">
              <div className="flex items-start gap-2 text-amber-800 text-xs">
                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                <p>
                  <strong>Clinical Alert:</strong> {interactionWarning}
                </p>
              </div>
            </div>
          )}

          {/* Totals & Action */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{subtotal.toLocaleString()} TZS</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>VAT (18%)</span>
                <span>{vat.toLocaleString()} TZS</span>
              </div>
              <div className="flex justify-between font-bold text-xl text-teal-900 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>{total.toLocaleString()} TZS</span>
              </div>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={() => {
                setPreviewMode(false);
                setCustomerModalOpen(true);
              }}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2"
            >
              <Send size={18} /> Send to Finance
            </button>
            <p className="text-xs text-center text-slate-500 mt-2">
              Inventory will be deducted after payment.
            </p>
          </div>
        </div>
      </div>

      {/* Customer Name & Preview Modal */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
          <div
            className={`bg-white rounded-2xl w-full ${previewMode ? 'max-w-2xl' : 'max-w-sm'
              } overflow-hidden animate-in fade-in zoom-in duration-200 transition-all no-print`}
          >
            {!previewMode ? (
              <>
                <div className="p-6 border-b border-slate-100 text-center relative">
                  <h3 className="text-xl font-bold text-slate-900">Order Details</h3>
                  <p className="text-slate-500 text-sm">Step 1: Assign to Customer</p>
                  <button
                    onClick={() => setCustomerModalOpen(false)}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. Walk-in Client, John Doe"
                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="p-6 bg-slate-50 flex justify-end gap-3">
                  <button
                    onClick={() => setCustomerModalOpen(false)}
                    className="px-4 py-2 text-slate-500 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!customerName.trim()) {
                        showError('Validation', 'Please enter a customer name.');
                        return;
                      }
                      setPreviewMode(true);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2"
                  >
                    Preview Invoice <ArrowRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-slate-800 text-white flex justify-between items-center no-print">
                  <h3 className="font-bold flex items-center gap-2">
                    <FileText size={18} className="text-blue-400" /> Proforma Invoice Preview
                  </h3>
                  <button
                    onClick={() => setCustomerModalOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-8 bg-slate-50 max-h-[60vh] overflow-y-auto">
                  <div className="bg-white border border-slate-200 p-6 shadow-sm text-sm">
                    {/* Invoice Header */}
                    <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                      <div>
                        <h1 className="text-lg font-bold text-slate-900 uppercase">Proforma Invoice</h1>
                        <p className="text-slate-500">Date: {new Date().toLocaleDateString()}</p>
                        <p className="text-slate-500">Branch: {branchName}</p>
                      </div>
                      <div className="text-right">
                        <h2 className="font-bold text-slate-900">PMS Pharmacy</h2>
                        <p className="text-slate-500">TIN: 123-456-789</p>
                        <p className="text-slate-500">
                          Bill To: <span className="font-bold text-slate-800">{customerName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full text-left mb-6">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="py-2 pl-2">Item</th>
                          <th className="py-2 text-center">Qty</th>
                          <th className="py-2 text-right">Price</th>
                          <th className="py-2 text-right pr-2">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cart.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 pl-2 font-medium">{item.name}</td>
                            <td className="py-2 text-center">{item.quantity}</td>
                            <td className="py-2 text-right">{(item.price || 0).toLocaleString()}</td>
                            <td className="py-2 text-right pr-2">
                              {((item.price || 0) * item.quantity).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end">
                      <div className="w-48 space-y-2">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal:</span>
                          <span>{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>VAT (18%):</span>
                          <span>{vat.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg text-slate-900 border-t border-slate-200 pt-2">
                          <span>Total:</span>
                          <span>{total.toLocaleString()} TZS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex justify-between gap-3 no-print">
                  <button
                    onClick={() => setPreviewMode(false)}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg flex items-center gap-2"
                  >
                    <ArrowLeft size={16} /> Back to Edit
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrintProforma}
                      className="px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 flex items-center gap-2"
                    >
                      <Printer size={16} /> Print
                    </button>
                    <button
                      onClick={handleGenerateProforma}
                      className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-md flex items-center gap-2"
                    >
                      <Send size={16} /> Confirm & Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Print Template - Proforma Invoice */}
      <div className="print-only">
        <div className="max-w-xl mx-auto border border-black p-8 text-black">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold uppercase">PMS Pharmacy</h1>
            <p>TIN: 123-456-789 | VRN: 40-001234</p>
            <p>Bagamoyo Road, Dar es Salaam</p>
            <p>Branch: {branchName}</p>
          </div>
          <hr className="border-black my-4" />
          <div className="flex justify-between font-bold text-lg mb-2">
            <span>PROFORMA INVOICE</span>
          </div>
          <p>Date: {new Date().toLocaleDateString()}</p>
          <p>Customer: {customerName}</p>
          <hr className="border-black my-4" />
          <table className="w-full text-left mb-6">
            <thead>
              <tr className="border-b border-black">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{(item.price || 0).toLocaleString()}</td>
                  <td className="py-2 text-right">{((item.price || 0) * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="border-black my-4" />
          <div className="flex justify-between font-bold text-xl">
            <span>TOTAL</span>
            <span>{total.toLocaleString()} TZS</span>
          </div>
          <div className="mt-8 text-center text-sm">
            <p>This is not a fiscal receipt. Please pay at Finance.</p>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed bottom-8 right-8 bg-teal-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 fade-in duration-300 z-50 no-print">
          <CheckCircle className="text-teal-400" />
          <div>
            <h4 className="font-bold">Sent to Finance</h4>
            <p className="text-sm text-teal-100">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {errorMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 fade-in duration-300 z-50 no-print">
          <AlertTriangle className="text-white" />
          <div>
            <h4 className="font-bold">Stock Alert</h4>
            <p className="text-sm text-rose-100">{errorMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
