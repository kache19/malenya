<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

try {
    require_once 'config/database.php';
    require_once 'utils/jwt.php';
    require_once 'utils/auth.php';
} catch (Exception $e) {
    error_log('Failed to load required files: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error', 'details' => $e->getMessage()]);
    exit;
}

// Simple router
$request_uri = $_SERVER['REQUEST_URI'];
$request_method = $_SERVER['REQUEST_METHOD'];

// Remove query string
$path = parse_url($request_uri, PHP_URL_PATH);
// Remove base path and /api prefix
$path = str_replace('/pharmacy/backend_php/index.php', '', $path);
$path = str_replace('/backend_php/index.php', '', $path);
$path = str_replace('/api', '', $path);

error_log("Router - Original URI: $request_uri");
error_log("Router - Processed path: $path");
error_log("Router - Method: $request_method");

// Route patterns
$routes = [
    ['method' => 'GET', 'pattern' => '/health', 'file' => 'routes/health.php'],
    ['method' => 'GET', 'pattern' => '/debug', 'file' => 'debug.php'],
    ['method' => 'GET', 'pattern' => '/auth/me', 'file' => 'routes/auth.php'],
    ['method' => 'POST', 'pattern' => '/auth/login', 'file' => 'routes/auth.php'],
    ['method' => 'POST', 'pattern' => '/auth/refresh', 'file' => 'routes/auth.php'],
    ['method' => 'POST', 'pattern' => '/auth/logout', 'file' => 'routes/auth.php'],
    ['method' => 'GET', 'pattern' => '/products', 'file' => 'routes/products.php'],
    ['method' => 'GET', 'pattern' => '/products/{id}', 'file' => 'routes/products.php'],
    ['method' => 'POST', 'pattern' => '/products', 'file' => 'routes/products.php'],
    ['method' => 'POST', 'pattern' => '/products/bulk', 'file' => 'routes/products.php'],
    ['method' => 'PUT', 'pattern' => '/products/{id}', 'file' => 'routes/products.php'],
    ['method' => 'DELETE', 'pattern' => '/products/{id}', 'file' => 'routes/products.php'],
    ['method' => 'DELETE', 'pattern' => '/products', 'file' => 'routes/products.php'],
    ['method' => 'GET', 'pattern' => '/staff', 'file' => 'routes/staff.php'],
    ['method' => 'GET', 'pattern' => '/staff/{id}', 'file' => 'routes/staff.php'],
    ['method' => 'POST', 'pattern' => '/staff', 'file' => 'routes/staff.php'],
    ['method' => 'PUT', 'pattern' => '/staff/{id}', 'file' => 'routes/staff.php'],
    ['method' => 'DELETE', 'pattern' => '/staff/{id}', 'file' => 'routes/staff.php'],
    ['method' => 'GET', 'pattern' => '/branches', 'file' => 'routes/branches.php'],
    ['method' => 'GET', 'pattern' => '/branches/{id}', 'file' => 'routes/branches.php'],
    ['method' => 'GET', 'pattern' => '/branches/{id}/staff', 'file' => 'routes/branches.php'],
    ['method' => 'GET', 'pattern' => '/branches/{id}/inventory-summary', 'file' => 'routes/branches.php'],
    ['method' => 'GET', 'pattern' => '/branches/{id}/sales-summary', 'file' => 'routes/branches.php'],
    ['method' => 'POST', 'pattern' => '/branches', 'file' => 'routes/branches.php'],
    ['method' => 'PATCH', 'pattern' => '/branches/{id}', 'file' => 'routes/branches.php'],
    ['method' => 'DELETE', 'pattern' => '/branches/{id}', 'file' => 'routes/branches.php'],
    ['method' => 'GET', 'pattern' => '/inventory', 'file' => 'routes/inventory.php'],
    ['method' => 'GET', 'pattern' => '/inventory/{id}', 'file' => 'routes/inventory.php'],
    ['method' => 'GET', 'pattern' => '/stock', 'file' => 'routes/inventory.php'],
    ['method' => 'GET', 'pattern' => '/stock/{id}', 'file' => 'routes/inventory.php'],
    ['method' => 'POST', 'pattern' => '/inventory', 'file' => 'routes/inventory.php'],
    ['method' => 'POST', 'pattern' => '/inventory/add', 'file' => 'routes/inventory.php'],
    ['method' => 'POST', 'pattern' => '/stock', 'file' => 'routes/inventory.php'],
    ['method' => 'POST', 'pattern' => '/stock/add', 'file' => 'routes/inventory.php'],
    ['method' => 'POST', 'pattern' => '/inventory/adjust', 'file' => 'routes/inventory.php'],
    ['method' => 'POST', 'pattern' => '/inventory/verify', 'file' => 'routes/inventory.php'],
    ['method' => 'GET', 'pattern' => '/inventory/transfers', 'file' => 'routes/inventory.php'],
    ['method' => 'POST', 'pattern' => '/inventory/transfers', 'file' => 'routes/inventory.php'],
    ['method' => 'POST', 'pattern' => '/inventory/transfers/{id}/approve', 'file' => 'routes/inventory.php'],
    ['method' => 'PUT', 'pattern' => '/inventory/{id}/{id2}', 'file' => 'routes/inventory.php'],
    ['method' => 'PUT', 'pattern' => '/stock/{id}/{id2}', 'file' => 'routes/inventory.php'],
    ['method' => 'GET', 'pattern' => '/sales', 'file' => 'routes/sales.php'],
    ['method' => 'GET', 'pattern' => '/sales/history', 'file' => 'routes/sales.php'],
    ['method' => 'GET', 'pattern' => '/sales/{id}', 'file' => 'routes/sales.php'],
    ['method' => 'GET', 'pattern' => '/sales/summary/dashboard', 'file' => 'routes/sales.php'],
    ['method' => 'POST', 'pattern' => '/sales', 'file' => 'routes/sales.php'],
    ['method' => 'POST', 'pattern' => '/sales/checkout', 'file' => 'routes/sales.php'],
    ['method' => 'GET', 'pattern' => '/expenses', 'file' => 'routes/expenses.php'],
    ['method' => 'GET', 'pattern' => '/expenses/{id}', 'file' => 'routes/expenses.php'],
    ['method' => 'POST', 'pattern' => '/expenses', 'file' => 'routes/expenses.php'],
    ['method' => 'PUT', 'pattern' => '/expenses/{id}', 'file' => 'routes/expenses.php'],
    ['method' => 'PATCH', 'pattern' => '/expenses/{id}', 'file' => 'routes/expenses.php'],
    ['method' => 'DELETE', 'pattern' => '/expenses/{id}', 'file' => 'routes/expenses.php'],
    ['method' => 'GET', 'pattern' => '/patients', 'file' => 'routes/patients.php'],
    ['method' => 'GET', 'pattern' => '/patients/{id}', 'file' => 'routes/patients.php'],
    ['method' => 'POST', 'pattern' => '/patients', 'file' => 'routes/patients.php'],
    ['method' => 'PUT', 'pattern' => '/patients/{id}', 'file' => 'routes/patients.php'],
    ['method' => 'GET', 'pattern' => '/settings', 'file' => 'routes/settings.php'],
    ['method' => 'POST', 'pattern' => '/settings', 'file' => 'routes/settings.php'],
    ['method' => 'PUT', 'pattern' => '/settings/{id}', 'file' => 'routes/settings.php'],
    ['method' => 'GET', 'pattern' => '/finance/invoices', 'file' => 'routes/finance.php'],
    ['method' => 'GET', 'pattern' => '/finance/invoices/{id}/html', 'file' => 'routes/finance.php'],
    ['method' => 'GET', 'pattern' => '/finance/invoices/{id}/pdf', 'file' => 'routes/finance.php'],
    ['method' => 'POST', 'pattern' => '/finance/invoices', 'file' => 'routes/finance.php'],
    ['method' => 'POST', 'pattern' => '/finance/payments', 'file' => 'routes/finance.php'],
    ['method' => 'POST', 'pattern' => '/finance/invoices/{id}/payments', 'file' => 'routes/finance.php'],
    ['method' => 'GET', 'pattern' => '/finance/expenses', 'file' => 'routes/finance.php'],
    ['method' => 'POST', 'pattern' => '/finance/expenses', 'file' => 'routes/finance.php'],
    ['method' => 'PATCH', 'pattern' => '/finance/expenses/{id}/approve', 'file' => 'routes/finance.php'],
    ['method' => 'GET', 'pattern' => '/finance/payments/{id}', 'file' => 'routes/finance.php'],
    ['method' => 'GET', 'pattern' => '/finance/summary', 'file' => 'routes/finance.php'],
    ['method' => 'GET', 'pattern' => '/disposals', 'file' => 'routes/disposals.php'],
    ['method' => 'PUT', 'pattern' => '/disposals/{id}', 'file' => 'routes/disposals.php'],
    ['method' => 'GET', 'pattern' => '/requisitions', 'file' => 'routes/requisitions.php'],
    ['method' => 'GET', 'pattern' => '/requisitions/{id}', 'file' => 'routes/requisitions.php'],
    ['method' => 'POST', 'pattern' => '/requisitions', 'file' => 'routes/requisitions.php'],
    ['method' => 'PUT', 'pattern' => '/requisitions/{id}', 'file' => 'routes/requisitions.php'],
    ['method' => 'GET', 'pattern' => '/prescriptions', 'file' => 'routes/prescriptions.php'],
    ['method' => 'GET', 'pattern' => '/prescriptions/{id}', 'file' => 'routes/prescriptions.php'],
    ['method' => 'POST', 'pattern' => '/prescriptions', 'file' => 'routes/prescriptions.php'],
    ['method' => 'PUT', 'pattern' => '/prescriptions/{id}', 'file' => 'routes/prescriptions.php'],
    ['method' => 'GET', 'pattern' => '/audit-logs', 'file' => 'routes/audit_logs.php'],
    ['method' => 'POST', 'pattern' => '/audit-logs', 'file' => 'routes/audit_logs.php'],
    ['method' => 'GET', 'pattern' => '/shipments', 'file' => 'routes/shipments.php'],
    ['method' => 'GET', 'pattern' => '/shipments/{id}', 'file' => 'routes/shipments.php'],
    ['method' => 'POST', 'pattern' => '/shipments', 'file' => 'routes/shipments.php'],
    ['method' => 'PUT', 'pattern' => '/shipments/{id}', 'file' => 'routes/shipments.php'],
];

try {
    $matched = false;
    error_log("Router - Looking for route match...");
    foreach ($routes as $route) {
        if ($route['method'] === $request_method) {
            $pattern = str_replace(['{id}', '{id2}'], '([^/]+)', $route['pattern']);
            error_log("Router - Checking pattern: {$route['pattern']} -> $pattern against path: $path");
            if (preg_match("#^$pattern$#", $path, $matches)) {
                error_log("Router - MATCH FOUND: {$route['pattern']} -> {$route['file']}");
                // For auth routes, extract the action from the path
                if (strpos($route['pattern'], '/auth/') === 0) {
                    $parts = explode('/', $path);
                    if (count($parts) >= 3) {
                        $_GET['subpath'] = $parts[2]; // 'login', 'me', etc.
                    }
                } else {
                    // Set $_GET['id'] if there's an ID parameter
                    if (isset($matches[1])) {
                        $_GET['id'] = $matches[1];
                    }
                    // Set $_GET['id2'] if there's a second ID parameter
                    if (isset($matches[2])) {
                        $_GET['id2'] = $matches[2];
                    }
                    // Set $_GET['subpath'] if there's a sub-path
                    if (isset($matches[3])) {
                        $_GET['subpath'] = $matches[3];
                    }
                }
                require_once $route['file'];
                $matched = true;
                break;
            }
        }
    }

    if (!$matched) {
        error_log("Router - NO MATCH FOUND for path: $path, method: $request_method");
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
    }
} catch (Exception $e) {
    error_log('Routing error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error', 'details' => $e->getMessage()]);
}
?>