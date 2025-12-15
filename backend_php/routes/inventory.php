<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api/inventory', '', $path);
$path = str_replace('/api/stock', '', $path); // Handle /api/stock alias

// Parse path parameters
$id = $_GET['id'] ?? null;
$id2 = $_GET['id2'] ?? null;
$subpath = $_GET['subpath'] ?? null;

$branchId = $id;
$productId = $id2;
$action = $subpath;

// Special handling for /inventory/transfers
$request_uri = $_SERVER['REQUEST_URI'] ?? '';
if (strpos($request_uri, '/inventory/transfers') !== false) {
    $action = 'transfers';
}

error_log("Inventory route - method: $method, id: $id, id2: $id2, subpath: $subpath, action: $action, branchId: $branchId, productId: $productId, URI: $request_uri");

switch ($method) {
    case 'GET':
        if ($action === 'transfers') {
            getTransfers();
        } elseif ($branchId && !$productId) {
            getBranchInventory($branchId);
        } else {
            getAllInventory();
        }
        break;
    case 'POST':
        if ($action === 'add' || (!$action && !$branchId)) {
            addStock();
        } elseif ($action === 'transfers') {
            error_log("Calling createTransfer()");
            createTransfer();
        } elseif ($action === 'adjust') {
            adjustStock();
        } elseif ($action === 'verify') {
            verifyTransfer();
        } elseif ($id && $action === 'approve') {
            approveTransfer($id);
        } else {
            error_log("No matching POST action found - action: '$action', branchId: '$branchId'");
        }
        break;
    case 'PUT':
        if ($branchId && $productId) {
            updateInventoryItem($branchId, $productId);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getAllInventory() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);

        // First get all inventory items
        $stmt = $pdo->query("
            SELECT
                bi.branch_id,
                bi.product_id,
                bi.quantity,
                bi.custom_price,
                p.name, p.generic_name, p.category, p.cost_price, p.base_price, p.unit, p.min_stock_level
            FROM branch_inventory bi
            JOIN products p ON bi.product_id = p.id
            ORDER BY bi.branch_id, p.name
        ");

        $rows = $stmt->fetchAll();
        $inventoryMap = [];

        // Get batches separately for each product
        foreach ($rows as $row) {
            $branchId = $row['branch_id'];
            $productId = $row['product_id'];

            if (!isset($inventoryMap[$branchId])) {
                $inventoryMap[$branchId] = [];
            }

            // Get batches for this product
            $batchStmt = $pdo->prepare("
                SELECT batch_number, expiry_date, quantity, status
                FROM drug_batches
                WHERE branch_id = ? AND product_id = ?
                ORDER BY expiry_date
            ");
            $batchStmt->execute([$branchId, $productId]);
            $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);

            $inventoryMap[$branchId][] = [
                'productId' => $row['product_id'],
                'quantity' => (int)$row['quantity'],
                'customPrice' => (float)$row['custom_price'],
                'batches' => array_map(function($batch) {
                    return [
                        'batchNumber' => $batch['batch_number'],
                        'expiryDate' => $batch['expiry_date'],
                        'quantity' => (int)$batch['quantity'],
                        'status' => $batch['status']
                    ];
                }, $batches)
            ];
        }

        echo json_encode($inventoryMap);
    } catch (Exception $e) {
        error_log('Failed to fetch inventory: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getBranchInventory($branchId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);

        $stmt = $pdo->prepare("
            SELECT
                bi.product_id,
                bi.quantity,
                bi.custom_price,
                p.name, p.generic_name, p.category, p.cost_price, p.base_price, p.unit, p.min_stock_level
            FROM branch_inventory bi
            JOIN products p ON bi.product_id = p.id
            WHERE bi.branch_id = ?
            ORDER BY p.name
        ");
        $stmt->execute([$branchId]);

        $rows = $stmt->fetchAll();
        $inventory = [];

        foreach ($rows as $row) {
            // Get batches for this product
            $batchStmt = $pdo->prepare("
                SELECT batch_number, expiry_date, quantity, status
                FROM drug_batches
                WHERE branch_id = ? AND product_id = ?
                ORDER BY expiry_date
            ");
            $batchStmt->execute([$branchId, $row['product_id']]);
            $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);

            $inventory[] = [
                'productId' => $row['product_id'],
                'name' => $row['name'],
                'genericName' => $row['generic_name'],
                'category' => $row['category'],
                'quantity' => (int)$row['quantity'],
                'customPrice' => (float)$row['custom_price'],
                'costPrice' => (float)$row['cost_price'],
                'basePrice' => (float)$row['base_price'],
                'unit' => $row['unit'],
                'minStockLevel' => (int)$row['min_stock_level'],
                'batches' => array_map(function($batch) {
                    return [
                        'batchNumber' => $batch['batch_number'],
                        'expiryDate' => $batch['expiry_date'],
                        'quantity' => (int)$batch['quantity'],
                        'status' => $batch['status']
                    ];
                }, $batches)
            ];
        }

        echo json_encode($inventory);
    } catch (Exception $e) {
        error_log('Failed to fetch branch inventory: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function addStock() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $branchId = $input['branchId'] ?? '';
        $productId = $input['productId'] ?? '';
        $batchNumber = $input['batchNumber'] ?? '';
        $expiryDate = $input['expiryDate'] ?? '';
        $quantity = (int)($input['quantity'] ?? 0);

        $pdo->beginTransaction();

        // Insert/Update Batch
        $stmt = $pdo->prepare("
            INSERT INTO drug_batches (branch_id, product_id, batch_number, expiry_date, quantity, status)
            VALUES (?, ?, ?, ?, ?, 'ACTIVE')
        ");
        $stmt->execute([$branchId, $productId, $batchNumber, $expiryDate, $quantity]);

        // Update Total Quantity
        $stmt = $pdo->prepare("
            INSERT INTO branch_inventory (branch_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        ");
        $stmt->execute([$branchId, $productId, $quantity]);

        $pdo->commit();
        echo json_encode(['message' => 'Stock added successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to add stock: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getTransfers() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);
        $stmt = $pdo->query("SELECT * FROM stock_transfers ORDER BY date_sent DESC LIMIT 100");
        $transfers = $stmt->fetchAll();
        echo json_encode($transfers);
    } catch (Exception $e) {
        error_log('Failed to fetch transfers: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch transfers']);
    }
}

function createTransfer() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);

        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON payload']);
            return;
        }

        // All shipments are made from HEAD_OFFICE as the main branch
        $sourceBranchId = 'HEAD_OFFICE';
        $targetBranchId = $input['targetBranchId'] ?? '';
        $items = $input['items'] ?? [];
        $notes = $input['notes'] ?? '';

        // Validate required fields
        if (empty($targetBranchId) || empty($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: targetBranchId and items are required']);
            return;
        }

        // Validate items array
        if (!is_array($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Items must be an array']);
            return;
        }

        foreach ($items as $item) {
            if (!isset($item['productId']) || !isset($item['quantity']) || $item['quantity'] <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Each item must have productId and positive quantity']);
                return;
            }
        }

        // Validate branches exist
        $stmt = $pdo->prepare("SELECT id FROM branches WHERE id IN (?, ?)");
        $stmt->execute([$sourceBranchId, $targetBranchId]);
        $existingBranches = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (count($existingBranches) < 2) {
            http_response_code(400);
            echo json_encode(['error' => 'One or both branches do not exist']);
            return;
        }

        $transferId = 'TRANSFER-' . time();
        $user = getCurrentUser();
        $createdBy = $user['id'] ?? null;

        $itemsJson = json_encode($items);
        if ($itemsJson === false) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid items data']);
            return;
        }

        // Insert transfer
        $stmt = $pdo->prepare("
            INSERT INTO stock_transfers
            (id, from_branch_id, to_branch_id, products, status, notes, created_by)
            VALUES (?, ?, ?, ?, 'IN_TRANSIT', ?, ?)
        ");

        $result = $stmt->execute([$transferId, $sourceBranchId, $targetBranchId, $itemsJson, $notes, $createdBy]);

        if (!$result) {
            $error = $stmt->errorInfo();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to insert transfer', 'db_error' => $error]);
            return;
        }

        // Return transfer data
        $transfer = [
            'id' => $transferId,
            'from_branch_id' => $sourceBranchId,
            'to_branch_id' => $targetBranchId,
            'products' => $items,
            'status' => 'IN_TRANSIT',
            'notes' => $notes,
            'created_by' => $createdBy,
            'date_sent' => date('Y-m-d H:i:s')
        ];

        echo json_encode($transfer);
    } catch (Exception $e) {
        error_log('Failed to create transfer: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create transfer: ' . $e->getMessage()]);
    }
}

function adjustStock() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $branchId = $input['branchId'] ?? '';
        $productId = $input['productId'] ?? '';
        $adjustment = (int)($input['adjustment'] ?? 0);
        $reason = $input['reason'] ?? '';

        $pdo->beginTransaction();

        // Update inventory quantity
        $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = GREATEST(0, quantity + ?) WHERE branch_id = ? AND product_id = ?');
        $stmt->execute([$adjustment, $branchId, $productId]);

        // Log the adjustment (assuming inventory_adjustments table exists)
        $user = getCurrentUser();
        $stmt = $pdo->prepare('INSERT INTO inventory_adjustments (branch_id, product_id, adjustment, reason, created_by) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$branchId, $productId, $adjustment, $reason, $user['id'] ?? null]);

        $pdo->commit();
        echo json_encode(['message' => 'Stock adjusted successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to adjust stock: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function approveTransfer($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);

        $pdo->beginTransaction();

        // Get the transfer details
        $stmt = $pdo->prepare('SELECT * FROM stock_transfers WHERE id = ?');
        $stmt->execute([$id]);
        $transfer = $stmt->fetch();

        if (!$transfer) {
            http_response_code(404);
            echo json_encode(['error' => 'Transfer not found']);
            $pdo->rollBack();
            return;
        }

        if ($transfer['status'] !== 'IN_TRANSIT') {
            http_response_code(400);
            echo json_encode(['error' => 'Transfer is not in transit']);
            $pdo->rollBack();
            return;
        }

        // Update transfer status
        $stmt = $pdo->prepare('UPDATE stock_transfers SET status = ?, date_received = NOW() WHERE id = ?');
        $stmt->execute(['COMPLETED', $id]);

        // Move stock from source to target branch
        $products = json_decode($transfer['products'], true);
        foreach ($products as $item) {
            // Deduct from source branch
            $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = GREATEST(0, quantity - ?) WHERE branch_id = ? AND product_id = ?');
            $stmt->execute([$item['quantity'], $transfer['from_branch_id'], $item['productId']]);

            // Add to target branch
            $stmt = $pdo->prepare("
                INSERT INTO branch_inventory (branch_id, product_id, quantity)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
            ");
            $stmt->execute([$transfer['to_branch_id'], $item['productId'], $item['quantity']]);

            // Move batches from source to target
            if (isset($item['batchNumber'])) {
                $stmt = $pdo->prepare('UPDATE drug_batches SET branch_id = ? WHERE branch_id = ? AND product_id = ? AND batch_number = ?');
                $stmt->execute([$transfer['to_branch_id'], $transfer['from_branch_id'], $item['productId'], $item['batchNumber']]);
            }
        }

        $pdo->commit();
        echo json_encode(['message' => 'Transfer approved and stock moved successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to approve transfer: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to approve transfer']);
    }
}

function updateInventoryItem($branchId, $productId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $pdo->beginTransaction();

        $updates = [];
        $values = [];

        if (isset($input['customPrice']) || isset($input['costPrice']) || isset($input['basePrice'])) {
            if (isset($input['customPrice'])) {
                $updates[] = 'custom_price = ?';
                $values[] = $input['customPrice'];
            }
            if (isset($input['costPrice'])) {
                // Update product cost price
                $costStmt = $pdo->prepare('UPDATE products SET cost_price = ? WHERE id = ?');
                $costStmt->execute([$input['costPrice'], $productId]);
            }
            if (isset($input['basePrice'])) {
                // Update product base price
                $sellStmt = $pdo->prepare('UPDATE products SET base_price = ? WHERE id = ?');
                $sellStmt->execute([$input['basePrice'], $productId]);
            }
        }

        if (isset($input['quantity'])) {
            $updates[] = 'quantity = ?';
            $values[] = $input['quantity'];
        } elseif (isset($input['adjustment'])) {
            $updates[] = 'quantity = GREATEST(0, quantity + ?)';
            $values[] = $input['adjustment'];
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['error' => 'No valid fields to update']);
            $pdo->rollBack();
            return;
        }

        // Build the upsert query for MySQL
        $insertFields = ['branch_id', 'product_id'];
        $insertValues = [$branchId, $productId];
        $updateParts = [];

        if (isset($input['quantity'])) {
            $insertFields[] = 'quantity';
            $insertValues[] = $input['quantity'];
            $updateParts[] = 'quantity = VALUES(quantity)';
        } elseif (isset($input['adjustment'])) {
            // For adjustment, we need to handle it differently since MySQL doesn't support expressions in ON DUPLICATE KEY
            // We'll do a separate UPDATE if adjustment is provided
            $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = GREATEST(0, quantity + ?) WHERE branch_id = ? AND product_id = ?');
            $stmt->execute([$input['adjustment'], $branchId, $productId]);
            unset($input['adjustment']); // Remove so it's not processed again
        }

        if (isset($input['customPrice'])) {
            $insertFields[] = 'custom_price';
            $insertValues[] = $input['customPrice'];
            $updateParts[] = 'custom_price = VALUES(custom_price)';
        }

        // Handle cost and sell price updates for products table
        if (isset($input['costPrice'])) {
            $costStmt = $pdo->prepare('UPDATE products SET cost_price = ? WHERE id = ?');
            $costStmt->execute([$input['costPrice'], $productId]);
        }

        if (isset($input['basePrice'])) {
            $sellStmt = $pdo->prepare('UPDATE products SET base_price = ? WHERE id = ?');
            $sellStmt->execute([$input['basePrice'], $productId]);
        }

        if (!empty($updateParts)) {
            $placeholders = str_repeat('?,', count($insertValues) - 1) . '?';
            $query = "
                INSERT INTO branch_inventory (" . implode(', ', $insertFields) . ")
                VALUES ($placeholders)
                ON DUPLICATE KEY UPDATE " . implode(', ', $updateParts) . "
            ";

            $stmt = $pdo->prepare($query);
            $stmt->execute($insertValues);
        }

        // Get the updated record
        $stmt = $pdo->prepare('SELECT * FROM branch_inventory WHERE branch_id = ? AND product_id = ?');
        $stmt->execute([$branchId, $productId]);
        $result = $stmt->fetch();

        if (!$result) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update inventory item']);
            return;
        }

        $pdo->commit();
        echo json_encode($result);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to update inventory item: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function verifyTransfer() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $transferId = $input['transferId'] ?? '';
        $verificationCode = $input['verificationCode'] ?? '';

        // Placeholder implementation
        echo json_encode(['message' => 'Transfer verification endpoint - requires implementation']);
    } catch (Exception $e) {
        error_log('Failed to verify transfer: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>