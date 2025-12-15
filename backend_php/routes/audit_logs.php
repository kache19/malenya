<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getAuditLogs();
        break;
    case 'POST':
        createAuditLog();
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getAuditLogs() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'AUDITOR']);

        $limit = (int)($_GET['limit'] ?? 100);
        $offset = (int)($_GET['offset'] ?? 0);

        $stmt = $pdo->prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?');
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $logs = $stmt->fetchAll();
        $result = array_map(function($log) {
            return [
                'id' => $log['id'],
                'userId' => $log['user_id'],
                'userName' => $log['user_name'],
                'action' => $log['action'],
                'entityType' => $log['entity_type'],
                'entityId' => $log['entity_id'],
                'details' => $log['details'],
                'oldValues' => json_decode($log['old_values'], true),
                'newValues' => json_decode($log['new_values'], true),
                'ipAddress' => $log['ip_address'],
                'userAgent' => $log['user_agent'],
                'timestamp' => $log['timestamp'],
                'branchId' => $log['branch_id'],
                'severity' => $log['severity']
            ];
        }, $logs);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch audit logs: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createAuditLog() {
    global $pdo;

    try {
        $input = json_decode(file_get_contents('php://input'), true);

        $userId = $input['userId'] ?? null;
        $userName = $input['userName'] ?? '';
        $action = $input['action'] ?? '';
        $entityType = $input['entityType'] ?? null;
        $entityId = $input['entityId'] ?? null;
        $details = $input['details'] ?? null;
        $oldValues = isset($input['oldValues']) ? json_encode($input['oldValues']) : null;
        $newValues = isset($input['newValues']) ? json_encode($input['newValues']) : null;
        $ipAddress = $input['ipAddress'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $input['userAgent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? null;
        $branchId = $input['branchId'] ?? null;
        $severity = $input['severity'] ?? 'INFO';

        $stmt = $pdo->prepare('INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, old_values, new_values, ip_address, user_agent, branch_id, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $userName, $action, $entityType, $entityId, $details, $oldValues, $newValues, $ipAddress, $userAgent, $branchId, $severity]);

        echo json_encode(['message' => 'Audit log created']);
    } catch (Exception $e) {
        error_log('Failed to create audit log: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// Helper function to log actions automatically
function logAuditAction($action, $entityType, $entityId, $details = null, $oldValues = null, $newValues = null) {
    global $pdo;

    try {
        $user = getCurrentUser();
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

        $stmt = $pdo->prepare('INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, old_values, new_values, ip_address, user_agent, branch_id, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $user['id'] ?? null,
            $user['name'] ?? 'System',
            $action,
            $entityType,
            $entityId,
            $details,
            $oldValues ? json_encode($oldValues) : null,
            $newValues ? json_encode($newValues) : null,
            $ipAddress,
            $userAgent,
            $user['branch_id'] ?? null,
            'INFO'
        ]);
    } catch (Exception $e) {
        error_log('Failed to log audit action: ' . $e->getMessage());
    }
}
?>