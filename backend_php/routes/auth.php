<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$path = $_GET['subpath'] ?? '';

switch ($method) {
    case 'POST':
        if ($path === 'login') {
            handleLogin();
        } elseif ($path === 'refresh') {
            handleRefresh();
        } elseif ($path === 'logout') {
            handleLogout();
        }
        break;
    case 'GET':
        if ($path === 'me') {
            handleMe();
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function handleLogin() {
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
}

function handleMe() {
    global $pdo;

    try {
        $user = getCurrentUser();
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $stmt->execute([$user['id']]);
        $userData = $stmt->fetch();

        if (!$userData) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }

        $staffData = [
            'id' => $userData['id'],
            'name' => $userData['name'],
            'role' => $userData['role'],
            'branchId' => $userData['branch_id'],
            'email' => $userData['email'],
            'phone' => $userData['phone'],
            'status' => $userData['status'],
            'username' => $userData['username'],
            'joinedDate' => $userData['created_at']
        ];

        echo json_encode(['user' => $staffData]);
    } catch (Exception $e) {
        error_log('Get profile error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
    }
}

function handleRefresh() {
    global $pdo;

    try {
        $user = getCurrentUser();
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $stmt->execute([$user['id']]);
        $userData = $stmt->fetch();

        if (!$userData) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }

        $newToken = generateToken($userData);
        echo json_encode(['token' => $newToken]);
    } catch (Exception $e) {
        error_log('Token refresh error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
    }
}

function handleLogout() {
    // Client-side token removal is sufficient
    echo json_encode(['message' => 'Logged out successfully']);
}
?>