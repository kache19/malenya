<?php
header('Content-Type: application/json');

// Database credentials
$host = 'localhost';
$dbname = 'rodlineh_pharma';
$user = 'rodlineh_pharma';
$password = '@200r320KK';

echo json_encode([
    'testing' => 'Database Connection Test',
    'host' => $host,
    'database' => $dbname,
    'user' => $user
]) . "\n\n";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Database connection successful!\n\n";
    
    // Check if HEAD_OFFICE exists
    $stmt = $pdo->query("SELECT * FROM branches WHERE id = 'HEAD_OFFICE'");
    $branch = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($branch) {
        echo "✅ HEAD_OFFICE branch exists:\n";
        echo json_encode($branch, JSON_PRETTY_PRINT) . "\n\n";
    } else {
        echo "❌ HEAD_OFFICE branch NOT found\n\n";
    }
    
    // Check if admin user exists
    $stmt = $pdo->query("SELECT id, name, username, role, status, branch_id FROM staff WHERE username = 'admin'");
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($admin) {
        echo "✅ Admin user exists:\n";
        echo json_encode($admin, JSON_PRETTY_PRINT) . "\n\n";
    } else {
        echo "❌ Admin user NOT found\n\n";
    }
    
    // Check password hash
    $stmt = $pdo->query("SELECT password_hash FROM staff WHERE username = 'admin'");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        echo "Current password hash:\n";
        echo $result['password_hash'] . "\n\n";
        
        // Test password verification
        $testPassword = 'admin123';
        if (password_verify($testPassword, $result['password_hash'])) {
            echo "✅ Password 'admin123' verification: SUCCESS\n";
        } else {
            echo "❌ Password 'admin123' verification: FAILED\n";
            echo "This means the password hash is incorrect or different\n";
        }
    }
    
} catch (PDOException $e) {
    echo "❌ Database connection failed:\n";
    echo $e->getMessage() . "\n";
}
?>
