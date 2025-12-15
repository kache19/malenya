<?php
require_once 'config/database.php';
require_once 'utils/auth.php';

global $pdo;

try {
    echo "🌱 Seeding admin user...\n";

    // Check if admin already exists
    $stmt = $pdo->prepare('SELECT id FROM staff WHERE username = ?');
    $stmt->execute(['admin']);
    $existingAdmin = $stmt->fetch();

    if ($existingAdmin) {
        echo "✅ Admin user already exists!\n";
        echo "Username: admin\n";
        echo "Password: admin123\n";
        exit(0);
    }

    // Create admin user
    $adminData = [
        'id' => 'ADMIN-001',
        'name' => 'System Administrator',
        'role' => 'SUPER_ADMIN',
        'branch_id' => 'HEAD_OFFICE',
        'email' => 'admin@pms.co.tz',
        'phone' => '+255 700 123 456',
        'status' => 'ACTIVE',
        'username' => 'admin',
        'password' => 'admin123'
    ];

    $hashedPassword = hashPassword($adminData['password']);

    $stmt = $pdo->prepare('
        INSERT INTO staff (id, name, role, branch_id, email, phone, status, username, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    $stmt->execute([
        $adminData['id'],
        $adminData['name'],
        $adminData['role'],
        $adminData['branch_id'],
        $adminData['email'],
        $adminData['phone'],
        $adminData['status'],
        $adminData['username'],
        $hashedPassword
    ]);

    echo "✅ Admin user created successfully!\n";
    echo "Username: admin\n";
    echo "Password: admin123\n";
    echo "Role: SUPER_ADMIN\n";

} catch (Exception $e) {
    echo "❌ Error seeding admin: " . $e->getMessage() . "\n";
    exit(1);
}
?>