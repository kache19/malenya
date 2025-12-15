-- Pharmacy Management System Database Schema
-- MySQL

-- Create database (run this manually if needed)
-- CREATE DATABASE pms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
-- USE pms_db;

-- Branches table (created first, no circular dependencies)
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    manager_id VARCHAR(50), -- Will be set after staff table is populated
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff table (depends on branches)
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role ENUM('SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'PHARMACIST', 'CASHIER') NOT NULL,
    branch_id VARCHAR(50),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100),
    cost_price DECIMAL(10,2) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'Strip',
    min_stock_level INTEGER DEFAULT 10,
    requires_prescription BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branch inventory table
CREATE TABLE IF NOT EXISTS branch_inventory (
    branch_id VARCHAR(50),
    product_id VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 0,
    custom_price DECIMAL(10,2),
    PRIMARY KEY (branch_id, product_id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Products table (no dependencies)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100),
    cost_price DECIMAL(10,2) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'Strip',
    min_stock_level INTEGER DEFAULT 10,
    requires_prescription BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branch inventory table (depends on branches and products)
CREATE TABLE IF NOT EXISTS branch_inventory (
    branch_id VARCHAR(50),
    product_id VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 0,
    custom_price DECIMAL(10,2),
    PRIMARY KEY (branch_id, product_id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Drug batches table (depends on branches and products)
CREATE TABLE IF NOT EXISTS drug_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id VARCHAR(50),
    product_id VARCHAR(50),
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    status ENUM('ACTIVE', 'EXPIRED', 'REJECTED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Sales table (depends on branches)
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50),
    total_amount DECIMAL(10,2) NOT NULL,
    profit DECIMAL(10,2),
    payment_method VARCHAR(50),
    customer_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Sale items table (depends on sales and products)
CREATE TABLE IF NOT EXISTS sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id VARCHAR(50),
    product_id VARCHAR(50),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    batch_number VARCHAR(100),
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Invoices table (depends on branches)
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50),
    customer_name VARCHAR(255),
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    status ENUM('PAID', 'PARTIAL', 'UNPAID') DEFAULT 'UNPAID',
    due_date DATE,
    description TEXT,
    source VARCHAR(50) DEFAULT 'MANUAL',
    items TEXT, -- Store invoice items as JSON text
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Invoice payments table (depends on invoices)
CREATE TABLE IF NOT EXISTS invoice_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    method VARCHAR(50),
    receipt_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Expenses table (depends on branches)
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    branch_id VARCHAR(50),
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Patients table (depends on branches and staff)
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender ENUM('Male', 'Female', 'Other'),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(20),
    allergies TEXT, -- Array of allergy strings as JSON text
    medical_conditions TEXT, -- Array of conditions as JSON text
    current_medications TEXT, -- Array of current meds as JSON text
    branch_id VARCHAR(50),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_visit TIMESTAMP NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (created_by) REFERENCES staff(id)
);

-- Prescriptions table (depends on patients, branches, staff)
CREATE TABLE IF NOT EXISTS prescriptions (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50),
    doctor_name VARCHAR(255),
    diagnosis TEXT,
    notes TEXT,
    status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'ACTIVE',
    branch_id VARCHAR(50),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (created_by) REFERENCES staff(id)
);

-- Prescription items table (depends on prescriptions and products)
CREATE TABLE IF NOT EXISTS prescription_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id VARCHAR(50),
    medication_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    instructions TEXT,
    quantity_prescribed INTEGER,
    quantity_dispensed INTEGER DEFAULT 0,
    product_id VARCHAR(50), -- Link to inventory
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- System settings table (depends on staff)
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(100) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_category_key (category, setting_key),
    FOREIGN KEY (updated_by) REFERENCES staff(id)
);

-- Audit logs table (depends on branches)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50),
    user_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'staff', 'patient', 'prescription', etc.
    entity_id VARCHAR(50),
    details TEXT,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    branch_id VARCHAR(50),
    severity ENUM('INFO', 'WARNING', 'CRITICAL') DEFAULT 'INFO',
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Stock Transfers Table (depends on branches)
CREATE TABLE IF NOT EXISTS stock_transfers (
    id VARCHAR(50) PRIMARY KEY,
    from_branch_id VARCHAR(50) NOT NULL,
    to_branch_id VARCHAR(50) NOT NULL,
    products TEXT NOT NULL, -- Using TEXT instead of JSON for broader MySQL compatibility
    status ENUM('IN_TRANSIT', 'COMPLETED', 'CANCELLED') DEFAULT 'IN_TRANSIT',
    date_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_received TIMESTAMP NULL,
    notes TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (from_branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (to_branch_id) REFERENCES branches(id) ON DELETE CASCADE
    -- Removed created_by foreign key constraint to allow transfers without valid staff
);

CREATE INDEX IF NOT EXISTS idx_transfers_from_branch ON stock_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_branch ON stock_transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON stock_transfers(status);

-- Stock transfer items table (depends on stock_transfers and products)
CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transfer_id VARCHAR(50),
    product_id VARCHAR(50),
    product_name VARCHAR(255),
    quantity INTEGER NOT NULL,
    batch_number VARCHAR(100),
    expiry_date DATE,
    FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Shipments table (depends on stock_transfers, branches, staff)
CREATE TABLE IF NOT EXISTS shipments (
    id VARCHAR(50) PRIMARY KEY,
    transfer_id VARCHAR(50),
    from_branch_id VARCHAR(50),
    to_branch_id VARCHAR(50),
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'DELIVERED') DEFAULT 'PENDING',
    verification_code VARCHAR(10) UNIQUE,
    total_value DECIMAL(10,2),
    notes TEXT,
    created_by VARCHAR(50),
    approved_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id),
    FOREIGN KEY (from_branch_id) REFERENCES branches(id),
    FOREIGN KEY (to_branch_id) REFERENCES branches(id),
    FOREIGN KEY (created_by) REFERENCES staff(id),
    FOREIGN KEY (approved_by) REFERENCES staff(id)
);

-- Shipment approvers table (depends on shipments and staff)
CREATE TABLE IF NOT EXISTS shipment_approvers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shipment_id VARCHAR(50),
    approver_id VARCHAR(50),
    role VARCHAR(50) NOT NULL, -- e.g., 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER'
    notified_at TIMESTAMP NULL,
    responded_at TIMESTAMP NULL,
    response ENUM('APPROVED', 'REJECTED', 'PENDING') DEFAULT 'PENDING',
    UNIQUE KEY unique_shipment_approver (shipment_id, approver_id),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id),
    FOREIGN KEY (approver_id) REFERENCES staff(id)
);

-- Stock Requisitions Table (depends on branches and staff)
CREATE TABLE IF NOT EXISTS stock_requisitions (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL,
    requested_by VARCHAR(50) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED') DEFAULT 'PENDING',
    total_items INT DEFAULT 0,
    notes TEXT,
    priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_by VARCHAR(50),
    approved_at TIMESTAMP NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (requested_by) REFERENCES staff(id),
    FOREIGN KEY (approved_by) REFERENCES staff(id)
);

-- Stock Requisition Items (depends on stock_requisitions and products)
CREATE TABLE IF NOT EXISTS stock_requisition_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requisition_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity_requested INT NOT NULL,
    quantity_approved INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requisition_id) REFERENCES stock_requisitions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Requisition Approvers (depends on stock_requisitions and staff)
CREATE TABLE IF NOT EXISTS requisition_approvers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requisition_id VARCHAR(50) NOT NULL,
    approver_id VARCHAR(50) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    comments TEXT,
    responded_at TIMESTAMP NULL,
    FOREIGN KEY (requisition_id) REFERENCES stock_requisitions(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES staff(id)
);

-- Inventory adjustments table (depends on branches, products, staff)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id VARCHAR(50),
    product_id VARCHAR(50),
    adjustment INT NOT NULL,
    reason TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES staff(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_username ON staff(username);
CREATE INDEX IF NOT EXISTS idx_staff_branch ON staff(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch ON branch_inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_batches_branch_product ON drug_batches(branch_id, product_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_branch ON invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- New indexes for clinical features
CREATE INDEX IF NOT EXISTS idx_patients_branch ON patients(branch_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_branch ON prescriptions(branch_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_product ON prescription_items(product_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp_new ON audit_logs(timestamp DESC);

-- Insert default head office branch (do this after all tables are created)
INSERT INTO branches (id, name, location, status) VALUES
('HEAD_OFFICE', 'Head Office (Global View)', 'HQ', 'ACTIVE')
ON DUPLICATE KEY UPDATE name = VALUES(name), location = VALUES(location), status = VALUES(status);