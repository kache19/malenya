<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getStaff($id);
        } else {
            getStaffList();
        }
        break;
    case 'POST':
        createStaff();
        break;
    case 'PUT':
        if ($id) {
            updateStaff($id);
        }
        break;
    case 'DELETE':
        if ($id) {
            deleteStaff($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getStaffList() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'AUDITOR']);
        $stmt = $pdo->query('SELECT id, name, role, branch_id as branchId, email, phone, status, username FROM staff ORDER BY name ASC');
        $staff = $stmt->fetchAll();
        echo json_encode($staff);
    } catch (Exception $e) {
        error_log('Get staff list error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getStaff($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'AUDITOR']);
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $stmt->execute([$id]);
        $staff = $stmt->fetch();

        if (!$staff) {
            http_response_code(404);
            echo json_encode(['error' => 'Staff not found']);
            return;
        }

        echo json_encode($staff);
    } catch (Exception $e) {
        error_log('Get staff error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createStaff() {
    global $pdo;

    try {
        error_log('Starting staff creation');
        authorizeRoles(['SUPER_ADMIN']);
        error_log('Authorization passed');

        $input = json_decode(file_get_contents('php://input'), true);
        error_log('Input received: ' . json_encode($input));

        $id = $input['id'] ?? '';
        $name = $input['name'] ?? '';
        $role = $input['role'] ?? '';
        $branchId = $input['branchId'] ?? null;
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? '';
        $status = $input['status'] ?? 'ACTIVE';
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        error_log("Staff data: id=$id, name=$name, role=$role, username=$username");

        if (empty($id) || empty($name) || empty($role) || empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }

        $hashedPassword = hashPassword($password);
        $branchIdValue = $branchId === '' ? null : $branchId;

        error_log('Inserting staff into database');
        $stmt = $pdo->prepare('INSERT INTO staff (id, name, role, branch_id, email, phone, status, username, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$id, $name, $role, $branchIdValue, $email, $phone, $status, $username, $hashedPassword]);
        error_log('Staff inserted successfully');

        // Get the inserted staff data
        $stmt = $pdo->prepare('SELECT id, name, role, branch_id as branchId, email, phone, status, username FROM staff WHERE id = ?');
        $stmt->execute([$id]);
        $staff = $stmt->fetch();

        error_log('Staff creation completed');
        echo json_encode(['message' => 'Staff created successfully', 'staff' => $staff]);
    } catch (Exception $e) {
        error_log('Create staff error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateStaff($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN']);
        $input = json_decode(file_get_contents('php://input'), true);

        $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $stmt->execute([$id]);
        $currentStaff = $stmt->fetch();

        if (!$currentStaff) {
            http_response_code(404);
            echo json_encode(['error' => 'Staff member not found']);
            return;
        }

        $name = $input['name'] ?? $currentStaff['name'];
        $role = $input['role'] ?? $currentStaff['role'];
        $branchId = isset($input['branchId']) ? ($input['branchId'] === '' ? null : $input['branchId']) : $currentStaff['branch_id'];
        $email = $input['email'] ?? $currentStaff['email'];
        $phone = $input['phone'] ?? $currentStaff['phone'];
        $status = $input['status'] ?? $currentStaff['status'];

        $hashedPassword = $currentStaff['password_hash'];
        if (!empty($input['password'])) {
            $hashedPassword = hashPassword($input['password']);
        }

        $stmt = $pdo->prepare('UPDATE staff SET name = ?, role = ?, branch_id = ?, email = ?, phone = ?, status = ?, password_hash = ? WHERE id = ?');
        $stmt->execute([$name, $role, $branchId, $email, $phone, $status, $hashedPassword, $id]);

        // Get the updated staff data
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $stmt->execute([$id]);
        $staff = $stmt->fetch();

        echo json_encode(['message' => 'Staff updated successfully', 'staff' => $staff]);
    } catch (Exception $e) {
        error_log('Update staff error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function deleteStaff($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN']);

        // Check if staff exists before deletion
        $stmt = $pdo->prepare('SELECT id FROM staff WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Staff not found']);
            return;
        }

        // Delete the staff
        $stmt = $pdo->prepare('DELETE FROM staff WHERE id = ?');
        $stmt->execute([$id]);

        http_response_code(204);
    } catch (Exception $e) {
        error_log('Delete staff error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>