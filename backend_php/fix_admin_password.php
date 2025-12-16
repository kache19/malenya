<?php
header('Content-Type: text/html; charset=utf-8');

// Database credentials
$host = 'localhost';
$dbname = 'rodlineh_pharma';
$user = 'rodlineh_pharma';
$password = '@200r320KK';

echo "<h2>Admin Password Reset Script</h2>";
echo "<hr>";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Database connected<br><br>";
    
    // Generate a fresh password hash for 'admin123'
    $newPassword = 'admin123';
    $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
    
    echo "<strong>New password hash generated:</strong><br>";
    echo "<code>$newHash</code><br><br>";
    
    // Update the admin user's password
    $stmt = $pdo->prepare("UPDATE staff SET password_hash = ? WHERE username = 'admin'");
    $stmt->execute([$newHash]);
    
    echo "✅ Password updated in database<br><br>";
    
    // Verify the update
    $stmt = $pdo->query("SELECT username, password_hash FROM staff WHERE username = 'admin'");
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($admin) {
        echo "<strong>Admin user in database:</strong><br>";
        echo "Username: {$admin['username']}<br>";
        echo "Hash: <code>{$admin['password_hash']}</code><br><br>";
        
        // Verify password works
        if (password_verify($newPassword, $admin['password_hash'])) {
            echo "✅ <strong style='color: green; font-size: 18px;'>PASSWORD VERIFICATION SUCCESS!</strong><br>";
            echo "You can now login with:<br>";
            echo "Username: <strong>admin</strong><br>";
            echo "Password: <strong>admin123</strong><br><br>";
            echo "<a href='/'>Go to Login Page</a>";
        } else {
            echo "❌ Password verification failed<br>";
        }
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage();
}

echo "<hr>";
echo "<p><strong>Important:</strong> Delete this file after use for security!</p>";
?>
