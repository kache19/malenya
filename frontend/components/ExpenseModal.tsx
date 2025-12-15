import React from 'react';
import { X } from 'lucide-react';

interface ExpenseModalProps {
  showExpenseModal: boolean;
  setShowExpenseModal: (show: boolean) => void;
  newExpense: { description: string; category: string; amount: string; date: string };
  setNewExpense: (expense: any) => void;
  handleRecordExpense: () => void;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({
  showExpenseModal,
  setShowExpenseModal,
  newExpense,
  setNewExpense,
  handleRecordExpense
}) => {
  if (!showExpenseModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-900">Record Expense</h3>
          <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <input
              type="text"
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="e.g. Office Cleaning"
              value={newExpense.description}
              onChange={e => setNewExpense({...newExpense, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Category</label>
              <select
                className="w-full p-2 border border-slate-300 rounded-lg"
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value})}
              >
                <option>Utilities</option>
                <option>Supplies</option>
                <option>Maintenance</option>
                <option>Transport</option>
                <option>Salary/Wages</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Amount (TZS)</label>
              <input
                type="number"
                className="w-full p-2 border border-slate-300 rounded-lg"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              className="w-full p-2 border border-slate-300 rounded-lg"
              value={newExpense.date}
              onChange={e => setNewExpense({...newExpense, date: e.target.value})}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
          <button
            onClick={handleRecordExpense}
            disabled={!newExpense.amount || !newExpense.description}
            className="px-6 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseModal;