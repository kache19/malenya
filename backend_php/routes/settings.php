<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        getSettings();
        break;
    case 'POST':
        createSetting();
        break;
    case 'PUT':
        if ($id) {
            updateSetting($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getSettings() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'AUDITOR']);
        $stmt = $pdo->query('SELECT * FROM system_settings ORDER BY category, setting_key');
        $settings = $stmt->fetchAll();

        $result = array_map(function($s) {
            return [
                'id' => $s['id'],
                'category' => $s['category'],
                'settingKey' => $s['setting_key'],
                'settingValue' => $s['setting_value'],
                'dataType' => $s['data_type'],
                'description' => $s['description'],
                'updatedAt' => $s['updated_at']
            ];
        }, $settings);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Get settings error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createSetting() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN']);
        $input = json_decode(file_get_contents('php://input'), true);

        $id = $input['id'] ?? '';
        $category = $input['category'] ?? '';
        $settingKey = $input['settingKey'] ?? '';
        $settingValue = $input['settingValue'] ?? '';
        $dataType = $input['dataType'] ?? 'string';
        $description = $input['description'] ?? '';

        $stmt = $pdo->prepare('INSERT INTO system_settings (id, category, setting_key, setting_value, data_type, description) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$id, $category, $settingKey, $settingValue, $dataType, $description]);

        // Get the inserted setting
        $stmt = $pdo->prepare('SELECT * FROM system_settings WHERE id = ?');
        $stmt->execute([$id]);
        $setting = $stmt->fetch();

        echo json_encode(['message' => 'Setting created successfully', 'setting' => $setting]);
    } catch (Exception $e) {
        error_log('Create setting error: ' . $e->getMessage());
        if ($e->getCode() == 23000) { // Duplicate entry
            http_response_code(409);
            echo json_encode(['error' => 'Setting already exists']);
            return;
        }
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateSetting($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN']);
        $input = json_decode(file_get_contents('php://input'), true);

        $settingValue = $input['settingValue'] ?? '';

        $stmt = $pdo->prepare('UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$settingValue, $id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Setting not found']);
            return;
        }

        // Get the updated setting
        $stmt = $pdo->prepare('SELECT * FROM system_settings WHERE id = ?');
        $stmt->execute([$id]);
        $setting = $stmt->fetch();

        echo json_encode(['message' => 'Setting updated successfully', 'setting' => $setting]);
    } catch (Exception $e) {
        error_log('Update setting error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>