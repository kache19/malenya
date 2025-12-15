<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$subPath = $_GET['subpath'] ?? '';

switch ($method) {
    case 'GET':
        if ($id) {
            if ($subPath === 'staff') {
                getBranchStaff($id);
            } elseif ($subPath === 'inventory-summary') {
                getBranchInventorySummary($id);
            } elseif ($subPath === 'sales-summary') {
                getBranchSalesSummary($id);
            } else {
                getBranchDetails($id);
            }
        } else {
            getBranches();
        }
        break;
    case 'POST':
        createBranch();
        break;
    case 'PATCH':
        if ($id) {
            updateBranch($id);
        }
        break;
    case 'DELETE':
        if ($id) {
            deleteBranch($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getBranches() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'AUDITOR']);
        $stmt = $pdo->query("
            SELECT b.*, s.name as manager_name
            FROM branches b
            LEFT JOIN staff s ON b.manager_id = s.id
            ORDER BY b.name ASC
        ");
        $branches = $stmt->fetchAll();

        $result = array_map(function($b) {
            return [
                'id' => $b['id'],
                'name' => $b['name'],
                'location' => $b['location'],
                'manager' => $b['manager_name'] ?: 'Unassigned',
                'status' => $b['status']
            ];
        }, $branches);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch branches: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createBranch() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN']);
        $input = json_decode(file_get_contents('php://input'), true);

        $id = $input['id'] ?? '';
        $name = $input['name'] ?? '';
        $location = $input['location'] ?? '';
        $manager = $input['manager'] ?? null;
        $status = $input['status'] ?? 'ACTIVE';

        $managerId = null;
        if ($manager && $manager !== 'Unassigned') {
            $stmt = $pdo->prepare('SELECT id FROM staff WHERE name = ?');
            $stmt->execute([$manager]);
            $staff = $stmt->fetch();
            if ($staff) {
                $managerId = $staff['id'];
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Manager not found']);
                return;
            }
        }

        $stmt = $pdo->prepare('INSERT INTO branches (id, name, location, manager_id, status) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$id, $name, $location, $managerId, $status]);

        echo json_encode(['message' => 'Branch created successfully']);
    } catch (Exception $e) {
        error_log('Failed to create branch: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateBranch($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $updates = [];
        $values = [];

        if (isset($input['name'])) {
            $updates[] = 'name = ?';
            $values[] = $input['name'];
        }

        if (isset($input['location'])) {
            $updates[] = 'location = ?';
            $values[] = $input['location'];
        }

        if (isset($input['manager'])) {
            $managerId = null;
            if ($input['manager'] && $input['manager'] !== 'Unassigned') {
                $stmt = $pdo->prepare('SELECT id FROM staff WHERE name = ?');
                $stmt->execute([$input['manager']]);
                $staff = $stmt->fetch();
                if ($staff) {
                    $managerId = $staff['id'];
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'Manager not found']);
                    return;
                }
            }
            $updates[] = 'manager_id = ?';
            $values[] = $managerId;
        }

        if (isset($input['status'])) {
            $updates[] = 'status = ?';
            $values[] = $input['status'];
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['error' => 'No valid fields to update']);
            return;
        }

        $values[] = $id;
        $query = 'UPDATE branches SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $pdo->prepare($query);
        $stmt->execute($values);

        echo json_encode(['message' => 'Branch updated successfully']);
    } catch (Exception $e) {
        error_log('Failed to update branch: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function deleteBranch($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN']);

        // Check if branch exists
        $stmt = $pdo->prepare('SELECT * FROM branches WHERE id = ?');
        $stmt->execute([$id]);
        $branch = $stmt->fetch();

        if (!$branch) {
            http_response_code(404);
            echo json_encode(['error' => 'Branch not found']);
            return;
        }

        // Prevent deletion of HEAD_OFFICE
        if ($id === 'HEAD_OFFICE') {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot delete head office branch']);
            return;
        }

        // Check if branch has active staff
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM staff WHERE branch_id = ? AND status = 'ACTIVE'");
        $stmt->execute([$id]);
        $staffCount = $stmt->fetch()['count'];
        if ($staffCount > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot delete branch with active staff. Please reassign or deactivate staff first.']);
            return;
        }

        // Check if branch has inventory
        $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM branch_inventory WHERE branch_id = ?');
        $stmt->execute([$id]);
        $inventoryCount = $stmt->fetch()['count'];
        if ($inventoryCount > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot delete branch with existing inventory. Please transfer inventory first.']);
            return;
        }

        // Delete the branch
        $stmt = $pdo->prepare('DELETE FROM branches WHERE id = ?');
        $stmt->execute([$id]);

        echo json_encode(['message' => 'Branch deleted successfully']);
    } catch (Exception $e) {
        error_log('Failed to delete branch: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getBranchDetails($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'AUDITOR']);

        $stmt = $pdo->prepare("
            SELECT b.*, s.name as manager_name, s.email as manager_email
            FROM branches b
            LEFT JOIN staff s ON b.manager_id = s.id
            WHERE b.id = ?
        ");
        $stmt->execute([$id]);
        $branch = $stmt->fetch();

        if (!$branch) {
            http_response_code(404);
            echo json_encode(['error' => 'Branch not found']);
            return;
        }

        $stmt = $pdo->prepare("
            SELECT
                COUNT(DISTINCT bi.product_id) as total_products,
                COALESCE(SUM(bi.quantity), 0) as total_stock,
                COUNT(CASE WHEN bi.quantity <= p.min_stock_level THEN 1 END) as low_stock_items,
                COALESCE(SUM(s.total_amount), 0) as monthly_revenue
            FROM branch_inventory bi
            LEFT JOIN products p ON bi.product_id = p.id
            LEFT JOIN sales s ON bi.branch_id = s.branch_id AND s.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
            WHERE bi.branch_id = ?
            GROUP BY bi.branch_id
        ");
        $stmt->execute([$id]);
        $stats = $stmt->fetch() ?: [];

        $result = [
            'id' => $branch['id'],
            'name' => $branch['name'],
            'location' => $branch['location'],
            'manager' => [
                'id' => $branch['manager_id'],
                'name' => $branch['manager_name'],
                'email' => $branch['manager_email']
            ],
            'status' => $branch['status'],
            'statistics' => [
                'totalProducts' => (int)($stats['total_products'] ?? 0),
                'totalStock' => (int)($stats['total_stock'] ?? 0),
                'lowStockItems' => (int)($stats['low_stock_items'] ?? 0),
                'monthlyRevenue' => (float)($stats['monthly_revenue'] ?? 0)
            ]
        ];

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch branch details: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getBranchStaff($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'AUDITOR']);
        $stmt = $pdo->prepare('SELECT id, name, role, email, phone, status FROM staff WHERE branch_id = ? ORDER BY name ASC');
        $stmt->execute([$id]);
        $staff = $stmt->fetchAll();
        echo json_encode($staff);
    } catch (Exception $e) {
        error_log('Failed to fetch branch staff: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getBranchInventorySummary($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);
        $stmt = $pdo->prepare("
            SELECT
                p.category,
                COUNT(*) as product_count,
                COALESCE(SUM(bi.quantity), 0) as total_quantity,
                COUNT(CASE WHEN bi.quantity <= p.min_stock_level THEN 1 END) as low_stock_count
            FROM branch_inventory bi
            JOIN products p ON bi.product_id = p.id
            WHERE bi.branch_id = ?
            GROUP BY p.category
            ORDER BY p.category
        ");
        $stmt->execute([$id]);
        $summary = $stmt->fetchAll();

        $result = array_map(function($row) {
            return [
                'category' => $row['category'],
                'productCount' => (int)$row['product_count'],
                'totalQuantity' => (int)$row['total_quantity'],
                'lowStockCount' => (int)$row['low_stock_count']
            ];
        }, $summary);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch branch inventory summary: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getBranchSalesSummary($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'AUDITOR']);
        $period = $_GET['period'] ?? 'month';

        $dateFormat = '%Y-%m-%d';
        switch ($period) {
            case 'day':
                $dateFormat = '%Y-%m-%d';
                break;
            case 'week':
                $dateFormat = '%Y-%u';
                break;
            case 'month':
            default:
                $dateFormat = '%Y-%m';
                break;
        }

        $stmt = $pdo->prepare("
            SELECT
                DATE_FORMAT(created_at, ?) as period,
                COUNT(*) as sales_count,
                SUM(total_amount) as revenue,
                SUM(profit) as profit
            FROM sales
            WHERE branch_id = ?
            GROUP BY DATE_FORMAT(created_at, ?)
            ORDER BY period DESC
            LIMIT 12
        ");
        $stmt->execute([$dateFormat, $id, $dateFormat]);
        $summary = $stmt->fetchAll();

        $result = array_map(function($row) {
            return [
                'period' => $row['period'],
                'salesCount' => (int)$row['sales_count'],
                'revenue' => (float)$row['revenue'],
                'profit' => (float)$row['profit']
            ];
        }, $summary);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch branch sales summary: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>