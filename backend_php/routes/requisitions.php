<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getRequisition($id);
        } else {
            getRequisitions();
        }
        break;
    case 'POST':
        createRequisition();
        break;
    case 'PUT':
        if ($id) {
            updateRequisition($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getRequisitions() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);
        $stmt = $pdo->query('SELECT * FROM stock_requisitions ORDER BY created_at DESC');
        $requisitions = $stmt->fetchAll();
        echo json_encode($requisitions);
    } catch (Exception $e) {
        error_log('Failed to fetch requisitions: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch requisitions']);
    }
}

function getRequisition($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);
        $stmt = $pdo->prepare('SELECT * FROM stock_requisitions WHERE id = ?');
        $stmt->execute([$id]);
        $requisition = $stmt->fetch();

        if (!$requisition) {
            http_response_code(404);
            echo json_encode(['error' => 'Requisition not found']);
            return;
        }

        echo json_encode($requisition);
    } catch (Exception $e) {
        error_log('Failed to fetch requisition: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch requisition']);
    }
}

function createRequisition() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $branchId = $input['branchId'] ?? '';
        $requestedBy = $input['requestedBy'] ?? '';
        $items = $input['items'] ?? [];
        $notes = $input['notes'] ?? '';
        $priority = $input['priority'] ?? 'NORMAL';

        $requisitionId = 'REQ-' . time();

        $stmt = $pdo->prepare('INSERT INTO stock_requisitions (id, branch_id, requested_by, status, total_items, notes, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
        $stmt->execute([$requisitionId, $branchId, $requestedBy, 'PENDING', count($items), $notes, $priority]);

        // Insert requisition items
        if (!empty($items)) {
            $itemStmt = $pdo->prepare('INSERT INTO stock_requisition_items (requisition_id, product_id, quantity_requested, notes, created_at) VALUES (?, ?, ?, ?, NOW())');
            foreach ($items as $item) {
                $itemStmt->execute([$requisitionId, $item['productId'], $item['quantity'], $item['notes'] ?? '']);
            }
        }

        echo json_encode([
            'id' => $requisitionId,
            'message' => 'Requisition created successfully'
        ]);
    } catch (Exception $e) {
        error_log('Failed to create requisition: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create requisition']);
    }
}

function updateRequisition($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $status = $input['status'] ?? '';
        $approvedBy = $input['approvedBy'] ?? '';

        $stmt = $pdo->prepare('UPDATE stock_requisitions SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?');
        $stmt->execute([$status, $approvedBy, $id]);

        echo json_encode(['message' => 'Requisition updated successfully']);
    } catch (Exception $e) {
        error_log('Failed to update requisition: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update requisition']);
    }
}
?>