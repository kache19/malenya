<?php
require_once '../../config/database.php';
require_once '../../utils/auth.php';

global $pdo;

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password required']);
    return;
}

try {
    $stmt = $pdo->prepare('SELECT * FROM staff WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !verifyPassword($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
        return;
    }

    $token = generateToken($user);

    // Update last login
    $stmt = $pdo->prepare('UPDATE staff SET last_login = NOW() WHERE id = ?');
    $stmt->execute([$user['id']]);

    $staffData = [
        'id' => $user['id'],
        'name' => $user['name'],
        'role' => $user['role'],
        'branchId' => $user['branch_id'],
        'email' => $user['email'],
        'phone' => $user['phone'],
        'status' => $user['status'],
        'username' => $user['username'],
        'joinedDate' => $user['created_at']
    ];

    echo json_encode(['token' => $token, 'user' => $staffData]);
} catch (Exception $e) {
    error_log('Login error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
?>