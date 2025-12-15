<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getExpense($id);
        } else {
            getExpenses();
        }
        break;
    case 'POST':
        createExpense();
        break;
    case 'PUT':
        if ($id) {
            updateExpense($id);
        }
        break;
    case 'PATCH':
        if ($id) {
            updateExpenseStatus($id);
        }
        break;
    case 'DELETE':
        if ($id) {
            deleteExpense($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getExpenses() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $stmt = $pdo->query('SELECT * FROM expenses ORDER BY date DESC');
        $expenses = $stmt->fetchAll();

        $result = array_map(function($e) {
            return [
                'id' => (int)$e['id'],
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

function getExpense($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $stmt = $pdo->prepare('SELECT * FROM expenses WHERE id = ?');
        $stmt->execute([$id]);
        $expense = $stmt->fetch();

        if (!$expense) {
            http_response_code(404);
            echo json_encode(['error' => 'Expense not found']);
            return;
        }

        echo json_encode($expense);
    } catch (Exception $e) {
        error_log('Failed to fetch expense: ' . $e->getMessage());
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
        $branchId = $input['branchId'] ?? null;

        $stmt = $pdo->prepare('INSERT INTO expenses (category, description, amount, date, status, branch_id) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$category, $description, $amount, $date, 'Pending', $branchId]);
        $expenseId = $pdo->lastInsertId();

        echo json_encode(['message' => 'Expense created', 'expenseId' => $expenseId]);
    } catch (Exception $e) {
        error_log('Failed to create expense: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateExpense($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $input = json_decode(file_get_contents('php://input'), true);

        $category = $input['category'] ?? '';
        $description = $input['description'] ?? '';
        $amount = $input['amount'] ?? 0;
        $status = $input['status'] ?? '';
        $date = $input['date'] ?? '';

        $stmt = $pdo->prepare('UPDATE expenses SET category = ?, description = ?, amount = ?, status = ?, date = ? WHERE id = ?');
        $stmt->execute([$category, $description, $amount, $status, $date, $id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Expense not found']);
            return;
        }

        echo json_encode(['message' => 'Expense updated']);
    } catch (Exception $e) {
        error_log('Failed to update expense: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateExpenseStatus($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $input = json_decode(file_get_contents('php://input'), true);

        $status = $input['status'] ?? '';

        $stmt = $pdo->prepare('UPDATE expenses SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);

        echo json_encode(['message' => 'Expense updated']);
    } catch (Exception $e) {
        error_log('Failed to update expense status: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function deleteExpense($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $stmt = $pdo->prepare('DELETE FROM expenses WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Expense not found']);
            return;
        }

        http_response_code(204);
    } catch (Exception $e) {
        error_log('Failed to delete expense: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>