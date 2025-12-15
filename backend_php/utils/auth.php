<?php
require_once 'jwt.php';

function hashPassword($password) {
    $options = [
        'cost' => 10,
    ];
    return password_hash($password, PASSWORD_BCRYPT, $options);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function generateToken($user) {
    $payload = [
        'id' => $user['id'],
        'role' => $user['role'],
        'branch_id' => $user['branch_id'],
        'iat' => time(),
        'exp' => time() + (12 * 60 * 60) // 12 hours
    ];
    return JWT::encode($payload);
}

function authenticateToken() {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';

    // Also check $_SERVER for Authorization header (for CLI testing)
    if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (!$authHeader && isset($_SERVER['Authorization'])) {
        $authHeader = $_SERVER['Authorization'];
    }

    if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['error' => 'Access token required']);
        exit;
    }

    $token = $matches[1];
    $payload = JWT::decode($token);

    if (!$payload || isset($payload['exp']) && $payload['exp'] < time()) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid or expired token']);
        exit;
    }

    return $payload;
}

function authorizeRoles($allowedRoles) {
    $user = authenticateToken();

    if (!in_array($user['role'], $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['error' => 'Insufficient permissions']);
        exit;
    }

    return $user;
}

function getCurrentUser() {
    return authenticateToken();
}
?>