<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        getDisposals();
        break;
    case 'PUT':
        if ($id) {
            approveDisposal($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getDisposals() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        // For now, return empty array since disposal functionality is not yet implemented
        // TODO: Implement disposal requests table and logic
        echo json_encode([]);
    } catch (Exception $e) {
        error_log('Failed to fetch disposal requests: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch disposal requests']);
    }
}

function approveDisposal($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $status = $input['status'] ?? 'APPROVED';

        // For now, return success since disposal functionality is not yet implemented
        // TODO: Implement disposal approval logic
        error_log('Disposal request approved - disposalId: ' . $id . ', status: ' . $status);

        echo json_encode([
            'id' => $id,
            'status' => $status,
            'message' => 'Disposal request approved successfully'
        ]);
    } catch (Exception $e) {
        error_log('Failed to approve disposal request: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to approve disposal request']);
    }
}
?>