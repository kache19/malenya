<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getShipment($id);
        } else {
            getShipments();
        }
        break;
    case 'POST':
        createShipment();
        break;
    case 'PUT':
        if ($id) {
            updateShipment($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getShipments() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);
        $stmt = $pdo->query('SELECT * FROM shipments ORDER BY created_at DESC');
        $shipments = $stmt->fetchAll();
        echo json_encode($shipments);
    } catch (Exception $e) {
        error_log('Failed to fetch shipments: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch shipments']);
    }
}

function getShipment($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);
        $stmt = $pdo->prepare('SELECT * FROM shipments WHERE id = ?');
        $stmt->execute([$id]);
        $shipment = $stmt->fetch();

        if (!$shipment) {
            http_response_code(404);
            echo json_encode(['error' => 'Shipment not found']);
            return;
        }

        echo json_encode($shipment);
    } catch (Exception $e) {
        error_log('Failed to fetch shipment: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch shipment']);
    }
}

function createShipment() {
    global $pdo;

    try {
        // Log the incoming request for debugging
        error_log('Shipment creation request received');
        error_log('Request method: ' . $_SERVER['REQUEST_METHOD']);
        error_log('Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));

        // Check authentication
        try {
            authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
            $user = getCurrentUser();
            error_log('User authenticated: ' . ($user['id'] ?? 'unknown'));
        } catch (Exception $authError) {
            error_log('Authentication failed: ' . $authError->getMessage());
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required', 'details' => $authError->getMessage()]);
            return;
        }

        // Get and validate input
        $rawInput = file_get_contents('php://input');
        error_log('Raw input: ' . $rawInput);

        $input = json_decode($rawInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('JSON decode error: ' . json_last_error_msg());
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data', 'details' => json_last_error_msg()]);
            return;
        }

        error_log('Decoded input: ' . json_encode($input));

        // Validate required fields
        $transferId = $input['transferId'] ?? '';
        $fromBranchId = $input['fromBranchId'] ?? '';
        $toBranchId = $input['toBranchId'] ?? '';
        $status = $input['status'] ?? 'PENDING';
        $verificationCode = $input['verificationCode'] ?? '';
        $totalValue = $input['totalValue'] ?? 0;
        $notes = $input['notes'] ?? '';

        error_log("Validation - transferId: '$transferId', fromBranchId: '$fromBranchId', toBranchId: '$toBranchId'");

        if (empty($transferId) || empty($fromBranchId) || empty($toBranchId)) {
            error_log('Missing required fields');
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: transferId, fromBranchId, toBranchId']);
            return;
        }

        // Verify transfer exists
        $stmt = $pdo->prepare('SELECT id FROM stock_transfers WHERE id = ?');
        $stmt->execute([$transferId]);
        if (!$stmt->fetch()) {
            error_log("Transfer not found: $transferId");
            http_response_code(400);
            echo json_encode(['error' => 'Invalid transfer ID - transfer does not exist']);
            return;
        }

        // Verify branches exist
        $stmt = $pdo->prepare('SELECT id FROM branches WHERE id = ?');
        $stmt->execute([$fromBranchId]);
        if (!$stmt->fetch()) {
            error_log("From branch not found: $fromBranchId");
            http_response_code(400);
            echo json_encode(['error' => 'Invalid from branch ID']);
            return;
        }

        $stmt->execute([$toBranchId]);
        if (!$stmt->fetch()) {
            error_log("To branch not found: $toBranchId");
            http_response_code(400);
            echo json_encode(['error' => 'Invalid to branch ID']);
            return;
        }

        $shipmentId = 'SHIP-' . time();
        error_log("Creating shipment with ID: $shipmentId");

        $stmt = $pdo->prepare('INSERT INTO shipments (id, transfer_id, from_branch_id, to_branch_id, status, verification_code, total_value, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $result = $stmt->execute([$shipmentId, $transferId, $fromBranchId, $toBranchId, $status, $verificationCode, $totalValue, $notes, $user['id'] ?? null]);

        if (!$result) {
            error_log('Insert statement failed');
            http_response_code(500);
            echo json_encode(['error' => 'Database insert failed']);
            return;
        }

        // Get the created shipment
        $stmt = $pdo->prepare('SELECT * FROM shipments WHERE id = ?');
        $stmt->execute([$shipmentId]);
        $shipment = $stmt->fetch();

        if (!$shipment) {
            error_log('Failed to retrieve created shipment');
            http_response_code(500);
            echo json_encode(['error' => 'Shipment created but could not retrieve data']);
            return;
        }

        error_log('Shipment created successfully: ' . $shipmentId);
        echo json_encode($shipment);

    } catch (Exception $e) {
        error_log('Failed to create shipment: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'error' => 'Failed to create shipment',
            'details' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]);
    }
}

function updateShipment($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $updates = [];
        $values = [];

        $fields = ['status', 'verification_code', 'total_value', 'notes', 'approved_by'];
        foreach ($fields as $field) {
            if (isset($input[$field])) {
                $updates[] = "$field = ?";
                $values[] = $input[$field];
            }
        }

        if (isset($input['status']) && $input['status'] === 'APPROVED') {
            $updates[] = 'approved_at = NOW()';
        }

        if (!empty($updates)) {
            $values[] = $id;
            $query = 'UPDATE shipments SET ' . implode(', ', $updates) . ' WHERE id = ?';
            $stmt = $pdo->prepare($query);
            $stmt->execute($values);
        }

        echo json_encode(['message' => 'Shipment updated successfully']);
    } catch (Exception $e) {
        error_log('Failed to update shipment: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update shipment']);
    }
}
?>