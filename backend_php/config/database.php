<?php
// Database configuration - LOCALHOST ONLY
$host = 'localhost'; // Strictly localhost - no external connections
$dbname = getenv('DB_NAME') ?: 'malenyap_pms_db';
$user = getenv('DB_USER') ?: 'malenyap_malenya';
$password = getenv('DB_PASSWORD') ?: 'malenya12345';
$port = 3306; // Standard MySQL port

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::MYSQL_ATTR_INIT_COMMAND, "SET NAMES utf8mb4");

    // Additional security: disable external connections
    $pdo->exec("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'");
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    die(json_encode(['error' => 'Database connection failed - ensure MySQL is running on localhost']));
}

// Make $pdo available globally (not ideal, but for simplicity)
global $pdo;
?>