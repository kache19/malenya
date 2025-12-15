<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getPrescription($id);
        } else {
            getPrescriptions();
        }
        break;
    case 'POST':
        createPrescription();
        break;
    case 'PUT':
        if ($id) {
            updatePrescription($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getPrescriptions() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'PHARMACIST', 'CASHIER']);
        $stmt = $pdo->query("
            SELECT p.*, pt.name as patient_name
            FROM prescriptions p
            LEFT JOIN patients pt ON p.patient_id = pt.id
            ORDER BY p.created_at DESC
        ");
        $prescriptions = $stmt->fetchAll();

        $result = array_map(function($p) {
            return [
                'id' => $p['id'],
                'patientId' => $p['patient_id'],
                'patientName' => $p['patient_name'],
                'doctorName' => $p['doctor_name'],
                'diagnosis' => $p['diagnosis'],
                'notes' => $p['notes'],
                'status' => $p['status'],
                'branchId' => $p['branch_id'],
                'createdAt' => $p['created_at']
            ];
        }, $prescriptions);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch prescriptions: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getPrescription($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'PHARMACIST', 'CASHIER']);

        // Get prescription details
        $stmt = $pdo->prepare("
            SELECT p.*, pt.name as patient_name
            FROM prescriptions p
            LEFT JOIN patients pt ON p.patient_id = pt.id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        $prescription = $stmt->fetch();

        if (!$prescription) {
            http_response_code(404);
            echo json_encode(['error' => 'Prescription not found']);
            return;
        }

        // Get prescription items
        $itemsStmt = $pdo->prepare("
            SELECT id, medication_name, generic_name, dosage, frequency, duration, instructions, quantity_prescribed, quantity_dispensed, product_id
            FROM prescription_items
            WHERE prescription_id = ?
            ORDER BY id
        ");
        $itemsStmt->execute([$id]);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        $prescriptionData = [
            'id' => $prescription['id'],
            'patientId' => $prescription['patient_id'],
            'patientName' => $prescription['patient_name'],
            'doctorName' => $prescription['doctor_name'],
            'diagnosis' => $prescription['diagnosis'],
            'notes' => $prescription['notes'],
            'status' => $prescription['status'],
            'branchId' => $prescription['branch_id'],
            'createdAt' => $prescription['created_at'],
            'updatedAt' => $prescription['updated_at'],
            'items' => array_map(function($item) {
                return [
                    'id' => $item['id'],
                    'medicationName' => $item['medication_name'],
                    'genericName' => $item['generic_name'],
                    'dosage' => $item['dosage'],
                    'frequency' => $item['frequency'],
                    'duration' => $item['duration'],
                    'instructions' => $item['instructions'],
                    'quantityPrescribed' => (int)$item['quantity_prescribed'],
                    'quantityDispensed' => (int)$item['quantity_dispensed'],
                    'productId' => $item['product_id']
                ];
            }, $items)
        ];

        echo json_encode($prescriptionData);
    } catch (Exception $e) {
        error_log('Failed to fetch prescription: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createPrescription() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'PHARMACIST']);
        $input = json_decode(file_get_contents('php://input'), true);

        $id = $input['id'] ?? '';
        $patientId = $input['patientId'] ?? '';
        $doctorName = $input['doctorName'] ?? '';
        $diagnosis = $input['diagnosis'] ?? '';
        $notes = $input['notes'] ?? '';
        $status = $input['status'] ?? 'ACTIVE';
        $branchId = $input['branchId'] ?? '';
        $items = $input['items'] ?? [];

        $pdo->beginTransaction();

        $user = getCurrentUser();
        $stmt = $pdo->prepare('INSERT INTO prescriptions (id, patient_id, doctor_name, diagnosis, notes, status, branch_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$id, $patientId, $doctorName, $diagnosis, $notes, $status, $branchId, $user['id'] ?? null]);

        // Insert prescription items
        if (!empty($items)) {
            $itemStmt = $pdo->prepare('INSERT INTO prescription_items (prescription_id, medication_name, generic_name, dosage, frequency, duration, instructions, quantity_prescribed, product_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($items as $item) {
                $itemStmt->execute([
                    $id,
                    $item['medicationName'] ?? '',
                    $item['genericName'] ?? '',
                    $item['dosage'] ?? '',
                    $item['frequency'] ?? '',
                    $item['duration'] ?? '',
                    $item['instructions'] ?? '',
                    $item['quantityPrescribed'] ?? 0,
                    $item['productId'] ?? null
                ]);
            }
        }

        $pdo->commit();

        // Get the created prescription
        $stmt = $pdo->prepare('SELECT * FROM prescriptions WHERE id = ?');
        $stmt->execute([$id]);
        $prescription = $stmt->fetch();

        echo json_encode(['message' => 'Prescription created successfully', 'prescription' => $prescription]);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to create prescription: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updatePrescription($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'PHARMACIST']);
        $input = json_decode(file_get_contents('php://input'), true);

        $updates = [];
        $values = [];

        $fields = ['status', 'notes', 'diagnosis'];
        foreach ($fields as $field) {
            if (isset($input[$field])) {
                $updates[] = "$field = ?";
                $values[] = $input[$field];
            }
        }

        if (!empty($updates)) {
            $values[] = $id;
            $query = 'UPDATE prescriptions SET ' . implode(', ', $updates) . ', updated_at = NOW() WHERE id = ?';
            $stmt = $pdo->prepare($query);
            $stmt->execute($values);
        }

        echo json_encode(['message' => 'Prescription updated successfully']);
    } catch (Exception $e) {
        error_log('Failed to update prescription: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>