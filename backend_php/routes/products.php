<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getProduct($id);
        } else {
            getProducts();
        }
        break;
    case 'POST':
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        if (strpos($path, '/bulk') !== false) {
            bulkImportProducts();
        } else {
            createProduct();
        }
        break;
    case 'PUT':
        if ($id) {
            updateProduct($id);
        }
        break;
    case 'DELETE':
        if ($id) {
            deleteProduct($id);
        } else {
            clearProducts();
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getProducts() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'PHARMACIST', 'CASHIER']);
        $stmt = $pdo->query('SELECT * FROM products ORDER BY name ASC');
        $products = $stmt->fetchAll();
        echo json_encode($products);
    } catch (Exception $e) {
        error_log('Get products error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getProduct($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'PHARMACIST', 'CASHIER']);
        $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
        $stmt->execute([$id]);
        $product = $stmt->fetch();

        if (!$product) {
            http_response_code(404);
            echo json_encode(['error' => 'Product not found']);
            return;
        }

        echo json_encode($product);
    } catch (Exception $e) {
        error_log('Get product error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createProduct() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $id = $input['id'] ?? '';
        $name = $input['name'] ?? '';
        $genericName = $input['genericName'] ?? '';
        $category = $input['category'] ?? '';
        $costPrice = $input['costPrice'] ?? 0;
        $price = $input['price'] ?? 0;
        $unit = $input['unit'] ?? 'Strip';
        $minStockLevel = $input['minStockLevel'] ?? 10;

        $stmt = $pdo->prepare('INSERT INTO products (id, name, generic_name, category, cost_price, base_price, unit, min_stock_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$id, $name, $genericName, $category, $costPrice, $price, $unit, $minStockLevel]);

        // Get the inserted product
        $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
        $stmt->execute([$id]);
        $product = $stmt->fetch();

        echo json_encode(['message' => 'Product created', 'product' => $product]);
    } catch (Exception $e) {
        error_log('Create product error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function bulkImportProducts() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['products']) || !is_array($input['products'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Products array is required']);
            return;
        }

        $products = $input['products'];
        $results = [
            'total' => count($products),
            'successful' => 0,
            'failed' => 0,
            'successDetails' => [],
            'failures' => []
        ];

        $pdo->beginTransaction();

        foreach ($products as $index => $productData) {
            try {
                // Validate required fields
                $id = $productData['id'] ?? '';
                $name = $productData['name'] ?? '';

                if (empty($id) || empty($name)) {
                    $results['failures'][] = [
                        'index' => $index,
                        'name' => $name ?: 'Unknown',
                        'reason' => 'Missing required fields: id and name are required'
                    ];
                    $results['failed']++;
                    continue;
                }

                // Extract other fields with defaults
                $genericName = $productData['genericName'] ?? '';
                $category = $productData['category'] ?? '';
                $costPrice = $productData['costPrice'] ?? 0;
                $price = $productData['price'] ?? 0;
                $unit = $productData['unit'] ?? 'Strip';
                $minStockLevel = $productData['minStockLevel'] ?? 10;

                // Check if product already exists
                $stmt = $pdo->prepare('SELECT id FROM products WHERE id = ?');
                $stmt->execute([$id]);
                if ($stmt->fetch()) {
                    $results['failures'][] = [
                        'index' => $index,
                        'name' => $name,
                        'reason' => 'Product with this ID already exists'
                    ];
                    $results['failed']++;
                    continue;
                }

                // Insert the product
                $stmt = $pdo->prepare('INSERT INTO products (id, name, generic_name, category, cost_price, base_price, unit, min_stock_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                $stmt->execute([$id, $name, $genericName, $category, $costPrice, $price, $unit, $minStockLevel]);

                $results['successDetails'][] = [
                    'index' => $index,
                    'id' => $id,
                    'name' => $name
                ];
                $results['successful']++;

            } catch (Exception $e) {
                $results['failures'][] = [
                    'index' => $index,
                    'name' => $productData['name'] ?? 'Unknown',
                    'reason' => $e->getMessage()
                ];
                $results['failed']++;
            }
        }

        $pdo->commit();

        // Create summary message
        $message = "Bulk import completed: {$results['successful']} successful";
        if ($results['failed'] > 0) {
            $message .= ", {$results['failed']} failed";
        }

        echo json_encode([
            'message' => $message,
            'results' => $results
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Bulk import error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateProduct($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $updates = [];
        $values = [];

        $fields = [
            'name' => 'name',
            'genericName' => 'generic_name',
            'category' => 'category',
            'costPrice' => 'cost_price',
            'price' => 'base_price',
            'unit' => 'unit',
            'minStockLevel' => 'min_stock_level',
            'requiresPrescription' => 'requires_prescription'
        ];

        foreach ($fields as $jsonKey => $dbKey) {
            if (isset($input[$jsonKey])) {
                $updates[] = "$dbKey = ?";
                $values[] = $input[$jsonKey];
            }
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['error' => 'No valid fields to update']);
            return;
        }

        $values[] = $id;
        $query = 'UPDATE products SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $pdo->prepare($query);
        $stmt->execute($values);

        // Get the updated product
        $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
        $stmt->execute([$id]);
        $product = $stmt->fetch();

        if (!$product) {
            http_response_code(404);
            echo json_encode(['error' => 'Product not found']);
            return;
        }

        echo json_encode(['message' => 'Product updated', 'product' => $product]);
    } catch (Exception $e) {
        error_log('Update product error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function deleteProduct($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Product not found']);
            return;
        }

        http_response_code(204);
    } catch (Exception $e) {
        error_log('Delete product error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function clearProducts() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN']);
        // Delete in order to handle foreign key constraints
        $pdo->exec('DELETE FROM stock_requisition_items');
        $pdo->exec('DELETE FROM stock_transfer_items');
        $pdo->exec('DELETE FROM prescription_items');
        $pdo->exec('DELETE FROM sale_items');
        $pdo->exec('DELETE FROM drug_batches');
        $pdo->exec('DELETE FROM branch_inventory');

        $stmt = $pdo->query('SELECT COUNT(*) as count FROM products');
        $beforeCount = $stmt->fetch()['count'];

        $pdo->exec('DELETE FROM products');

        echo json_encode([
            'message' => 'All products cleared successfully',
            'deletedCount' => $beforeCount
        ]);
    } catch (Exception $e) {
        error_log('Clear products error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>