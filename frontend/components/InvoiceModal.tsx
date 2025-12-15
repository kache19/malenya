import React from 'react';
import { User, X } from 'lucide-react';

interface InvoiceModalProps {
  showInvoiceModal: boolean;
  setShowInvoiceModal: (show: boolean) => void;
  newInvoice: { customer: string; amount: string; description: string; due: string; includeVAT: boolean };
  setNewInvoice: (invoice: any) => void;
  handleCreateInvoice: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  showInvoiceModal,
  setShowInvoiceModal,
  newInvoice,
  setNewInvoice,
  handleCreateInvoice
}) => {
  if (!showInvoiceModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Create New Invoice</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Customer Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                className="w-full pl-9 p-2 border border-slate-300 rounded-lg"
                placeholder="e.g. Aga Khan Hospital"
                value={newInvoice.customer}
                onChange={e => setNewInvoice({...newInvoice, customer: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <input
              type="text"
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="Items Summary"
              value={newInvoice.description}
              onChange={e => setNewInvoice({...newInvoice, description: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Total Amount</label>
              <input
                type="number"
                className="w-full p-2 border border-slate-300 rounded-lg"
                placeholder="0.00"
                value={newInvoice.amount}
                onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Due Date</label>
              <input
                type="date"
                className="w-full p-2 border border-slate-300 rounded-lg"
                value={newInvoice.due}
                onChange={e => setNewInvoice({...newInvoice, due: e.target.value})}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeVAT"
              checked={newInvoice.includeVAT}
              onChange={e => setNewInvoice({...newInvoice, includeVAT: e.target.checked})}
              className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="includeVAT" className="text-sm font-medium text-slate-700">
              Include VAT (18%)
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 text-slate-600">Cancel</button>
          <button onClick={handleCreateInvoice} className="px-4 py-2 bg-teal-600 text-white rounded-lg">Create Invoice</button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;