<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getPatient($id);
        } else {
            getPatients();
        }
        break;
    case 'POST':
        createPatient();
        break;
    case 'PUT':
        if ($id) {
            updatePatient($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getPatients() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'PHARMACIST', 'CASHIER']);
        $stmt = $pdo->query('SELECT * FROM patients ORDER BY name ASC');
        $patients = $stmt->fetchAll();

        $result = array_map(function($p) {
            return [
                'id' => $p['id'],
                'name' => $p['name'],
                'age' => (int)$p['age'],
                'gender' => $p['gender'],
                'phone' => $p['phone'],
                'email' => $p['email'],
                'address' => $p['address'],
                'emergencyContact' => $p['emergency_contact'],
                'emergencyPhone' => $p['emergency_phone'],
                'allergies' => json_decode($p['allergies'], true) ?? [],
                'medicalConditions' => json_decode($p['medical_conditions'], true) ?? [],
                'currentMedications' => json_decode($p['current_medications'], true) ?? [],
                'branchId' => $p['branch_id'],
                'createdAt' => $p['created_at']
            ];
        }, $patients);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch patients: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getPatient($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'PHARMACIST', 'CASHIER']);
        $stmt = $pdo->prepare('SELECT * FROM patients WHERE id = ?');
        $stmt->execute([$id]);
        $patient = $stmt->fetch();

        if (!$patient) {
            http_response_code(404);
            echo json_encode(['error' => 'Patient not found']);
            return;
        }

        // Decode JSON fields
        $patient['allergies'] = json_decode($patient['allergies'], true) ?? [];
        $patient['medical_conditions'] = json_decode($patient['medical_conditions'], true) ?? [];
        $patient['current_medications'] = json_decode($patient['current_medications'], true) ?? [];

        echo json_encode($patient);
    } catch (Exception $e) {
        error_log('Failed to fetch patient: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createPatient() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'PHARMACIST', 'CASHIER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $id = $input['id'] ?? '';
        $name = $input['name'] ?? '';
        $age = $input['age'] ?? null;
        $gender = $input['gender'] ?? '';
        $phone = $input['phone'] ?? '';
        $email = $input['email'] ?? '';
        $address = $input['address'] ?? '';
        $emergencyContact = $input['emergencyContact'] ?? '';
        $emergencyPhone = $input['emergencyPhone'] ?? '';
        $allergies = json_encode($input['allergies'] ?? []);
        $medicalConditions = json_encode($input['medicalConditions'] ?? []);
        $currentMedications = json_encode($input['currentMedications'] ?? []);
        $branchId = $input['branchId'] ?? null;

        $user = getCurrentUser();
        $createdBy = $user['id'] ?? 'SYSTEM';

        $stmt = $pdo->prepare('INSERT INTO patients (id, name, age, gender, phone, email, address, emergency_contact, emergency_phone, allergies, medical_conditions, current_medications, branch_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$id, $name, $age, $gender, $phone, $email, $address, $emergencyContact, $emergencyPhone, $allergies, $medicalConditions, $currentMedications, $branchId, $createdBy]);

        echo json_encode(['message' => 'Patient created successfully']);
    } catch (Exception $e) {
        error_log('Failed to create patient: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updatePatient($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'PHARMACIST', 'CASHIER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $name = $input['name'] ?? '';
        $age = $input['age'] ?? null;
        $gender = $input['gender'] ?? '';
        $phone = $input['phone'] ?? '';
        $email = $input['email'] ?? '';
        $address = $input['address'] ?? '';
        $emergencyContact = $input['emergencyContact'] ?? '';
        $emergencyPhone = $input['emergencyPhone'] ?? '';
        $allergies = json_encode($input['allergies'] ?? []);
        $medicalConditions = json_encode($input['medicalConditions'] ?? []);
        $currentMedications = json_encode($input['currentMedications'] ?? []);

        $stmt = $pdo->prepare('UPDATE patients SET name = ?, age = ?, gender = ?, phone = ?, email = ?, address = ?, emergency_contact = ?, emergency_phone = ?, allergies = ?, medical_conditions = ?, current_medications = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$name, $age, $gender, $phone, $email, $address, $emergencyContact, $emergencyPhone, $allergies, $medicalConditions, $currentMedications, $id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Patient not found']);
            return;
        }

        echo json_encode(['message' => 'Patient updated successfully']);
    } catch (Exception $e) {
        error_log('Failed to update patient: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>