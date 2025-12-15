
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  PHARMACIST = 'PHARMACIST',
  CASHIER = 'CASHIER',
  INVENTORY_CONTROLLER = 'INVENTORY_CONTROLLER',
  ACCOUNTANT = 'ACCOUNTANT',
  AUDITOR = 'AUDITOR'
}

export enum PaymentMethod {
  CASH = 'CASH',
  MOBILE_MONEY = 'MOBILE_MONEY', // M-Pesa, TigoPesa
  INSURANCE = 'INSURANCE', // NHIF, AAR
  CREDIT = 'CREDIT'
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  manager: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Staff {
  id: string;
  name: string;
  role: UserRole;
  branchId?: string; // Made optional for staff not assigned to a branch
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin?: string;
  joinedDate?: string; // Made optional since it's set by backend
  username: string; // Added for Auth
  password?: string; // Added for Auth (Mock only - in real app this is hashed)
}

export type BatchStatus = 'ACTIVE' | 'ON_HOLD' | 'REJECTED' | 'EXPIRED';

export interface DrugBatch {
  batchNumber: string;
  expiryDate: string; // ISO Date
  quantity: number;
  status: BatchStatus; // Added for Release Protocol
}

export interface Product {
  id: string;
  name: string;
  genericName: string;
  category: string; // e.g., Antibiotic, Analgesic
  costPrice: number; // Buying Price per unit
  price: number; // Selling Price per unit (Global Base Price)
  unit: string; // e.g., Tablet, Bottle
  minStockLevel: number;
  batches: DrugBatch[];
  requiresPrescription: boolean;
  totalStock: number; // Calculated field
}

export interface BranchInventoryItem {
  productId: string;
  quantity: number;
  batches: DrugBatch[];
  customPrice?: number; // Optional override for branch-specific pricing
}

export interface CartItem extends Product {
  quantity: number;
  selectedBatch: string;
  discount: number;
}

export interface Sale {
  id: string;
  date: string;
  branchId: string;
  items: CartItem[];
  totalAmount: number; // Revenue
  totalCost: number; // Cost of Goods Sold (COGS)
  profit: number; // Revenue - Cost
  paymentMethod: PaymentMethod;
  customerName?: string;
  insuranceProvider?: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
}

export interface InteractionResult {
  severity: 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';
  description: string;
}

// Stock Transfer Types
export type TransferStatus = 'IN_TRANSIT' | 'RECEIVED_KEEPER' | 'COMPLETED' | 'REJECTED';

export interface TransferItem {
  productId: string;
  productName: string;
  quantity: number;
  batchNumber: string;
  expiryDate: string;
}

export interface StockTransfer {
  id: string;
  sourceBranchId: string;
  targetBranchId: string;
  dateSent: string;
  items: TransferItem[];
  status: TransferStatus;
  notes?: string;
  // Security Keys for Verification Steps
  keeperCode?: string; // Code for Store Keeper to confirm receipt
  controllerCode?: string; // Code for Inventory Controller to verify
  workflow: {
    step: 'INITIATED' | 'KEEPER_CHECK' | 'CONTROLLER_VERIFY' | 'DONE';
    logs: {
      role: string; // 'Store Keeper' | 'Inventory Controller'
      action: string;
      timestamp: string;
      user: string;
    }[];
  };
}

// Stock Requisition (Branch Requesting Stock)
export interface StockRequisition {
  id: string;
  branchId: string;
  requestDate: string;
  requestedBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  priority: 'NORMAL' | 'URGENT';
  items: {
    productId: string;
    productName: string;
    currentStock: number;
    requestedQty: number;
  }[];
}

// Stock Release Request (New Protocol)
export interface StockReleaseRequest {
  id: string;
  branchId: string;
  requestedBy: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  items: {
    productId: string;
    productName: string;
    batchNumber: string;
    quantity: number;
  }[];
}

// Disposal Request (Expired Stock)
export interface DisposalRequest {
  id: string;
  branchId: string;
  requestedBy: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED';
  items: {
    productId: string;
    productName: string;
    batchNumber: string;
    quantity: number;
    reason: string;
  }[];
}

// Stock Release Request (New Protocol)
export interface StockReleaseRequest {
  id: string;
  branchId: string;
  requestedBy: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  items: {
    productId: string;
    productName: string;
    batchNumber: string;
    quantity: number;
  }[];
}

// Disposal Request (Expired Stock)
export interface DisposalRequest {
  id: string;
  branchId: string;
  requestedBy: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED';
  items: {
    productId: string;
    productName: string;
    batchNumber: string;
    quantity: number;
    reason: string;
  }[];
}

// Invoicing Types
export interface InvoicePayment {
  id: string;
  amount: number;
  date: string;
  receiptNumber: string;
  method: PaymentMethod;
  recordedBy: string;
}

export interface Invoice {
  id: string;
  branchId: string;
  customerName: string;
  dateIssued: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
  description: string;
  source: 'POS' | 'MANUAL'; // Logic to distinguish Proforma from Manual Invoice
  items?: CartItem[]; // Items from POS
  payments: InvoicePayment[];
  paymentMethod?: PaymentMethod; // Payment method for display
  includeVAT?: boolean; // Whether to include VAT in calculations
  archived?: boolean;
}

export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  branchId: string;
  archived?: boolean;
}

// Clinical Types
export interface Patient {
  id: string;
  name: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  phone?: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  allergies: string[];
  medicalConditions?: string[];
  currentMedications?: string[];
  branchId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  lastVisit?: string;
}

export interface PrescriptionItem {
  id?: number;
  prescriptionId?: string;
  medicationName: string;
  genericName?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  quantityPrescribed?: number;
  quantityDispensed?: number;
  productId?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName?: string;
  doctorName?: string;
  diagnosis?: string;
  notes?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  branchId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: PrescriptionItem[];
}

// System Settings Types
export interface SystemSetting {
  id: string;
  category: string;
  settingKey: string;
  settingValue?: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// Enhanced Audit Log
export interface AuditLog {
  id?: number;
  userId?: string;
  userName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
  branchId?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

// Shipment Types (New Notification System)
export interface Shipment {
  id: string;
  transferId?: string | null;
  fromBranchId: string;
  toBranchId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'DELIVERED';
  verificationCode: string;
  totalValue: number;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  approvedAt?: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
  }[];
}

export interface ShipmentApprover {
  id: number;
  shipmentId: string;
  approverId: string;
  role: string; // 'BRANCH_MANAGER' | 'INVENTORY_CONTROLLER'
  notifiedAt?: string;
  respondedAt?: string;
  response: 'APPROVED' | 'REJECTED' | 'PENDING';
}

// Audit Logs (Enhanced)
