<?php
/**
 * Professional Invoice Template
 * Matches the provided invoice design
 */

class InvoiceTemplate {
    private $pdo;
    private $companyInfo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->loadCompanySettings();
    }

    private function loadCompanySettings() {
        // Load company settings from database
        $settings = $this->getSettingsByCategory('company');

        $this->companyInfo = [
            'name' => $settings['company_name'] ?? 'MALENYA PHARMACEUTICAL COMPANY',
            'address' => $settings['company_address'] ?? '123 Pharmacy Street, Dar es Salaam, Tanzania',
            'phone' => $settings['company_phone'] ?? '+255 700 000 000',
            'email' => $settings['company_email'] ?? 'info@malenyapharmaceutical.com',
            'website' => $settings['company_website'] ?? 'www.malenyapharmaceutical.com',
            'tax_id' => $settings['company_tax_id'] ?? '123456789',
            'logo_path' => $settings['company_logo'] ?? 'logo.png',
            'tax_rate' => $settings['invoice_tax_rate'] ?? '18',
            'payment_terms' => $settings['invoice_payment_terms'] ?? 'Payment is due within 30 days of invoice date. Late payments may incur additional charges.',
            'footer_text' => $settings['invoice_footer_text'] ?? 'Thank you for your business!'
        ];
    }

    private function getSettingsByCategory($category) {
        try {
            $stmt = $this->pdo->prepare("SELECT setting_key, setting_value FROM system_settings WHERE category = ?");
            $stmt->execute([$category]);
            $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            return $settings;
        } catch (Exception $e) {
            // Return empty array if settings table doesn't exist or query fails
            return [];
        }
    }

    public function generateInvoice($invoiceId) {
        // Get invoice data
        $invoice = $this->getInvoiceData($invoiceId);
        if (!$invoice) {
            throw new Exception("Invoice not found");
        }

        // Get invoice items
        $items = $this->getInvoiceItems($invoiceId);

        // Get payments
        $payments = $this->getInvoicePayments($invoiceId);

        // Generate HTML
        $html = $this->generateHTML($invoice, $items, $payments);

        return $html;
    }

    private function getInvoiceData($invoiceId) {
        $stmt = $this->pdo->prepare("
            SELECT i.*, b.name as branch_name, b.location as branch_location
            FROM invoices i
            LEFT JOIN branches b ON i.branch_id = b.id
            WHERE i.id = ?
        ");
        $stmt->execute([$invoiceId]);
        return $stmt->fetch();
    }

    private function getInvoiceItems($invoiceId) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM invoice_payments
            WHERE invoice_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$invoiceId]);
        return $stmt->fetchAll();
    }

    private function getInvoicePayments($invoiceId) {
        // Note: The current schema stores items as JSON in the items column
        // We'll need to parse this
        $stmt = $this->pdo->prepare("SELECT items FROM invoices WHERE id = ?");
        $stmt->execute([$invoiceId]);
        $result = $stmt->fetch();

        if ($result && $result['items']) {
            return json_decode($result['items'], true) ?: [];
        }

        return [];
    }

    private function generateHTML($invoice, $payments, $items) {
        $subtotal = 0;
        $taxRate = (float)($this->companyInfo['tax_rate'] ?? 18) / 100; // Load from settings or default 18%
        $taxAmount = 0;
        $total = 0;

        // Calculate totals from items
        foreach ($items as $item) {
            $itemTotal = ($item['price'] ?? 0) * ($item['quantity'] ?? 0);
            $subtotal += $itemTotal;
        }

        $taxAmount = $subtotal * $taxRate;
        $total = $subtotal + $taxAmount;

        $html = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ' . htmlspecialchars($invoice['id']) . '</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #ddd;
            padding: 30px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
        }
        .logo-section {
            flex: 1;
        }
        .logo {
            max-width: 150px;
            max-height: 80px;
        }
        .company-info {
            flex: 2;
            text-align: center;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 5px;
        }
        .company-details {
            font-size: 12px;
            color: #666;
            line-height: 1.4;
        }
        .invoice-title {
            flex: 1;
            text-align: right;
        }
        .invoice-title h1 {
            color: #007bff;
            margin: 0;
            font-size: 36px;
        }
        .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .invoice-info, .customer-info {
            flex: 1;
        }
        .info-box {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 15px;
        }
        .info-box h3 {
            margin: 0 0 10px 0;
            color: #007bff;
            font-size: 14px;
            text-transform: uppercase;
        }
        .info-row {
            display: flex;
            margin-bottom: 5px;
        }
        .info-label {
            width: 100px;
            font-weight: bold;
            font-size: 12px;
        }
        .info-value {
            flex: 1;
            font-size: 12px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .items-table th {
            background: #007bff;
            color: white;
            padding: 10px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
        }
        .items-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
        }
        .items-table .description {
            width: 40%;
        }
        .items-table .quantity {
            width: 15%;
            text-align: center;
        }
        .items-table .rate {
            width: 20%;
            text-align: right;
        }
        .items-table .amount {
            width: 25%;
            text-align: right;
        }
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin: 20px 0;
        }
        .totals-table {
            width: 300px;
        }
        .totals-table td {
            padding: 5px 10px;
            font-size: 12px;
        }
        .totals-table .total-row {
            border-top: 2px solid #007bff;
            font-weight: bold;
            font-size: 14px;
        }
        .totals-table .amount {
            text-align: right;
        }
        .payment-info {
            background: #f8f9fa;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .payment-info h4 {
            margin: 0 0 10px 0;
            color: #007bff;
            font-size: 14px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-paid {
            background: #28a745;
            color: white;
        }
        .status-partial {
            background: #ffc107;
            color: black;
        }
        .status-unpaid {
            background: #dc3545;
            color: white;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <img src="' . $this->companyInfo['logo_path'] . '" alt="Logo" class="logo">
            </div>
            <div class="company-info">
                <div class="company-name">' . htmlspecialchars($this->companyInfo['name']) . '</div>
                <div class="company-details">
                    ' . htmlspecialchars($this->companyInfo['address']) . '<br>
                    Phone: ' . htmlspecialchars($this->companyInfo['phone']) . '<br>
                    Email: ' . htmlspecialchars($this->companyInfo['email']) . '<br>
                    Website: ' . htmlspecialchars($this->companyInfo['website']) . '
                </div>
            </div>
            <div class="invoice-title">
                <h1>INVOICE</h1>
            </div>
        </div>

        <!-- Invoice Details -->
        <div class="invoice-details">
            <div class="invoice-info">
                <div class="info-box">
                    <h3>Invoice Details</h3>
                    <div class="info-row">
                        <span class="info-label">Invoice #:</span>
                        <span class="info-value">' . htmlspecialchars($invoice['id']) . '</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date:</span>
                        <span class="info-value">' . date('d/m/Y', strtotime($invoice['created_at'])) . '</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Due Date:</span>
                        <span class="info-value">' . ($invoice['due_date'] ? date('d/m/Y', strtotime($invoice['due_date'])) : 'N/A') . '</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Status:</span>
                        <span class="info-value">
                            <span class="status-badge status-' . strtolower($invoice['status']) . '">
                                ' . htmlspecialchars($invoice['status']) . '
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            <div class="customer-info">
                <div class="info-box">
                    <h3>Bill To</h3>
                    <div class="info-row">
                        <span class="info-label">Customer:</span>
                        <span class="info-value">' . htmlspecialchars($invoice['customer_name']) . '</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Branch:</span>
                        <span class="info-value">' . htmlspecialchars($invoice['branch_name'] ?? 'N/A') . '</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th class="description">Description</th>
                    <th class="quantity">Quantity</th>
                    <th class="rate">Rate</th>
                    <th class="amount">Amount</th>
                </tr>
            </thead>
            <tbody>';

        foreach ($items as $item) {
            $itemTotal = ($item['price'] ?? 0) * ($item['quantity'] ?? 0);
            $html .= '
                <tr>
                    <td class="description">' . htmlspecialchars($item['name'] ?? 'Item') . '</td>
                    <td class="quantity">' . htmlspecialchars($item['quantity'] ?? 0) . '</td>
                    <td class="rate">TZS ' . number_format($item['price'] ?? 0, 2) . '</td>
                    <td class="amount">TZS ' . number_format($itemTotal, 2) . '</td>
                </tr>';
        }

        $html .= '
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td>Subtotal:</td>
                    <td class="amount">TZS ' . number_format($subtotal, 2) . '</td>
                </tr>
                <tr>
                    <td>VAT (' . htmlspecialchars($this->companyInfo['tax_rate']) . '%):</td>
                    <td class="amount">TZS ' . number_format($taxAmount, 2) . '</td>
                </tr>
                <tr class="total-row">
                    <td>Total:</td>
                    <td class="amount">TZS ' . number_format($total, 2) . '</td>
                </tr>
            </table>
        </div>

        <!-- Payment Information -->
        <div class="payment-info">
            <h4>Payment Terms & Conditions</h4>
            <p>' . nl2br(htmlspecialchars($this->companyInfo['payment_terms'])) . '</p>
            <p>Please make payments payable to: ' . htmlspecialchars($this->companyInfo['name']) . '</p>
            <p>Account Number: ' . htmlspecialchars($this->companyInfo['tax_id']) . '</p>
        </div>';

        if (!empty($invoice['description'])) {
            $html .= '
        <!-- Notes -->
        <div class="payment-info">
            <h4>Notes</h4>
            <p>' . nl2br(htmlspecialchars($invoice['description'])) . '</p>
        </div>';
        }

        $html .= '
        <!-- Footer -->
        <div class="footer">
            <p>' . htmlspecialchars($this->companyInfo['footer_text']) . '</p>
            <p>' . htmlspecialchars($this->companyInfo['name']) . ' | ' . htmlspecialchars($this->companyInfo['phone']) . ' | ' . htmlspecialchars($this->companyInfo['email']) . '</p>
        </div>
    </div>
</body>
</html>';

        return $html;
    }

    public function generatePDF($invoiceId) {
        // This would require a PDF library like TCPDF or Dompdf
        // For now, return HTML that can be converted to PDF
        $html = $this->generateInvoice($invoiceId);

        // Add PDF-specific styling
        $html = str_replace('<style>', '<style>@page { margin: 1cm; }', $html);

        return $html;
    }
}
?>