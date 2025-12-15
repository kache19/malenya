<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api/finance', '', $path);

// Parse path parameters
$id = null;
$action = null;

if (preg_match('/\/([^\/]+)\/([^\/]+)/', $path, $matches)) {
    // /resource/id/action
    $resource = $matches[1];
    $id = $matches[2];
    $action = isset($matches[3]) ? $matches[3] : null;
} elseif (preg_match('/\/([^\/]+)/', $path, $matches)) {
    // /resource or /resource/id
    $resource = $matches[1];
    if ($resource === 'invoices' || $resource === 'expenses' || $resource === 'payments' || $resource === 'summary') {
        $action = $resource;
        $resource = null;
    }
}

switch ($method) {
    case 'GET':
        if ($action === 'invoices') {
            getInvoices();
        } elseif ($resource === 'invoices' && $id && $action === 'html') {
            generateInvoiceHTML($id);
        } elseif ($resource === 'invoices' && $id && $action === 'pdf') {
            generateInvoicePDF($id);
        } elseif ($action === 'expenses') {
            getExpenses();
        } elseif ($action === 'summary') {
            getFinancialSummary();
        } elseif ($resource === 'payments' && $id) {
            getPayments($id);
        }
        break;
    case 'POST':
        if ($action === 'invoices') {
            createInvoice();
        } elseif ($action === 'expenses') {
            createExpense();
        } elseif ($action === 'payments') {
            recordPayment();
        } elseif ($resource === 'invoices' && $id && $action === 'payments') {
            recordInvoicePayment($id);
        }
        break;
    case 'PATCH':
        if ($resource === 'expenses' && $id && $action === 'approve') {
            approveExpense($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getInvoices() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $stmt = $pdo->query('SELECT * FROM invoices ORDER BY created_at DESC');
        $invoices = $stmt->fetchAll();

        $result = array_map(function($i) {
            return [
                'id' => $i['id'],
                'branchId' => $i['branch_id'],
                'customerName' => $i['customer_name'],
                'dateIssued' => $i['created_at'],
                'dueDate' => $i['due_date'],
                'totalAmount' => (float)$i['total_amount'],
                'paidAmount' => (float)$i['paid_amount'],
                'status' => $i['status'],
                'description' => $i['description'],
                'source' => $i['source'],
                'archived' => (bool)$i['archived'],
                'items' => json_decode($i['items'], true) ?? [],
                'payments' => [] // Would need separate query in real implementation
            ];
        }, $invoices);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch invoices: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createInvoice() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $id = $input['id'] ?? '';
        $branchId = $input['branchId'] ?? '';
        $customerName = $input['customerName'] ?? '';
        $totalAmount = $input['totalAmount'] ?? 0;
        $dueDate = $input['dueDate'] ?? null;
        $description = $input['description'] ?? '';
        $source = $input['source'] ?? 'MANUAL';
        $items = $input['items'] ?? [];

        $stmt = $pdo->prepare('INSERT INTO invoices (id, branch_id, customer_name, total_amount, paid_amount, status, due_date, description, source, items, created_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, NOW())');
        $stmt->execute([$id, $branchId, $customerName, $totalAmount, 'UNPAID', $dueDate, $description, $source, json_encode($items)]);

        echo json_encode(['message' => 'Invoice created successfully', 'invoiceId' => $id]);
    } catch (Exception $e) {
        error_log('Failed to create invoice: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function recordPayment() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $input = json_decode(file_get_contents('php://input'), true);

        $invoiceId = $input['invoiceId'] ?? '';
        $amount = $input['amount'] ?? 0;
        $method = $input['method'] ?? '';
        $receiptNumber = $input['receiptNumber'] ?? '';

        $pdo->beginTransaction();

        // Add payment record
        $stmt = $pdo->prepare('INSERT INTO invoice_payments (invoice_id, amount, method, receipt_number, created_at) VALUES (?, ?, ?, ?, NOW())');
        $stmt->execute([$invoiceId, $amount, $method, $receiptNumber]);

        // Update invoice status
        $stmt = $pdo->prepare("
            UPDATE invoices
            SET paid_amount = paid_amount + ?,
                status = CASE
                    WHEN paid_amount + ? >= total_amount THEN 'PAID'
                    ELSE 'PARTIAL'
                END
            WHERE id = ?
        ");
        $stmt->execute([$amount, $amount, $invoiceId]);

        $pdo->commit();
        echo json_encode(['message' => 'Payment recorded successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to record payment: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function recordInvoicePayment($invoiceId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $input = json_decode(file_get_contents('php://input'), true);

        $amount = $input['amount'] ?? 0;
        $method = $input['method'] ?? '';
        $receiptNumber = $input['receiptNumber'] ?? '';

        $stmt = $pdo->prepare('INSERT INTO invoice_payments (invoice_id, amount, method, receipt_number, created_at) VALUES (?, ?, ?, ?, NOW())');
        $stmt->execute([$invoiceId, $amount, $method, $receiptNumber]);

        // Get the inserted payment
        $stmt = $pdo->prepare('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY created_at DESC LIMIT 1');
        $stmt->execute([$invoiceId]);
        $payment = $stmt->fetch();

        echo json_encode($payment);
    } catch (Exception $e) {
        error_log('Failed to record invoice payment: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getExpenses() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $stmt = $pdo->query('SELECT * FROM expenses ORDER BY date DESC');
        $expenses = $stmt->fetchAll();

        $result = array_map(function($e) {
            return [
                'id' => $e['id'],
                'category' => $e['category'],
                'description' => $e['description'],
                'amount' => (float)$e['amount'],
                'date' => $e['date'],
                'status' => $e['status'],
                'branchId' => $e['branch_id'],
                'archived' => (bool)$e['archived']
            ];
        }, $expenses);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch expenses: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createExpense() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $input = json_decode(file_get_contents('php://input'), true);

        $category = $input['category'] ?? '';
        $description = $input['description'] ?? '';
        $amount = $input['amount'] ?? 0;
        $date = $input['date'] ?? '';
        $branchId = $input['branchId'] ?? '';

        $stmt = $pdo->prepare('INSERT INTO expenses (category, description, amount, date, status, branch_id) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$category, $description, $amount, $date, 'Pending', $branchId]);

        // Get the inserted expense ID
        $expenseId = $pdo->lastInsertId();

        echo json_encode(['id' => $expenseId, 'message' => 'Expense created successfully']);
    } catch (Exception $e) {
        error_log('Failed to create expense: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function approveExpense($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $status = $input['status'] ?? '';

        $stmt = $pdo->prepare('UPDATE expenses SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);

        echo json_encode(['message' => 'Expense status updated successfully']);
    } catch (Exception $e) {
        error_log('Failed to update expense status: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getPayments($invoiceId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $stmt = $pdo->prepare('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY created_at DESC');
        $stmt->execute([$invoiceId]);
        $payments = $stmt->fetchAll();

        $result = array_map(function($p) {
            return [
                'id' => $p['id'],
                'amount' => (float)$p['amount'],
                'method' => $p['method'],
                'receiptNumber' => $p['receipt_number'],
                'date' => $p['created_at']
            ];
        }, $payments);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch payments: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getFinancialSummary() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);

        $branchId = $_GET['branchId'] ?? null;
        $startDate = $_GET['startDate'] ?? null;
        $endDate = $_GET['endDate'] ?? null;

        $params = [];
        $whereClause = '';

        if ($startDate) {
            $whereClause .= ' AND created_at >= ?';
            $params[] = $startDate;
        }

        if ($endDate) {
            $whereClause .= ' AND created_at <= ?';
            $params[] = $endDate;
        }

        if ($branchId) {
            $whereClause .= ' AND branch_id = ?';
            $params[] = $branchId;
        }

        // Get sales data
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) as total_sales, COALESCE(SUM(profit), 0) as total_profit FROM sales WHERE 1=1 $whereClause");
        $stmt->execute($params);
        $sales = $stmt->fetch();

        // Get expenses data
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE status = 'Approved' " . str_replace('created_at', 'date', $whereClause));
        $stmt->execute($params);
        $expenses = $stmt->fetch();

        // Get invoices data
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) as total_invoiced, COALESCE(SUM(paid_amount), 0) as total_received FROM invoices WHERE 1=1 $whereClause");
        $stmt->execute($params);
        $invoices = $stmt->fetch();

        $summary = [
            'totalSales' => (float)$sales['total_sales'],
            'totalProfit' => (float)$sales['total_profit'],
            'totalExpenses' => (float)$expenses['total_expenses'],
            'totalInvoiced' => (float)$invoices['total_invoiced'],
            'totalReceived' => (float)$invoices['total_received'],
            'netIncome' => (float)$sales['total_profit'] - (float)$expenses['total_expenses']
        ];

        echo json_encode($summary);
    } catch (Exception $e) {
        error_log('Failed to fetch financial summary: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function generateInvoiceHTML($invoiceId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);

        $template = new InvoiceTemplate($pdo);
        $html = $template->generateInvoice($invoiceId);

        header('Content-Type: text/html');
        echo $html;
    } catch (Exception $e) {
        error_log('Failed to generate invoice HTML: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function generateInvoicePDF($invoiceId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);

        $template = new InvoiceTemplate($pdo);
        $html = $template->generatePDF($invoiceId);

        // For now, return HTML that can be converted to PDF
        // In production, you'd use a library like TCPDF or Dompdf
        header('Content-Type: text/html');
        header('Content-Disposition: attachment; filename="invoice_' . $invoiceId . '.html"');
        echo $html;
    } catch (Exception $e) {
        error_log('Failed to generate invoice PDF: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>