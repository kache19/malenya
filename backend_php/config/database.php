<?php
// Database configuration - LOCALHOST ONLY
$host = 'localhost'; // Strictly localhost - no external connections
$dbname = getenv('DB_NAME') ?: 'malenyap_pharma';
$user = getenv('DB_USER') ?: 'malenyap_pharma';
$password = getenv('DB_PASSWORD') ?: '@200r320KK';
$port = 3306; // Standard MySQL port

// PDO Wrapper class using MySQLi for compatibility
class PDOWrapper {
    private $mysqli;
    
    public function __construct($host, $user, $password, $dbname, $port = 3306) {
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
        $this->mysqli = new mysqli($host, $user, $password, $dbname, $port);
        $this->mysqli->set_charset('utf8mb4');
    }
    
    public function prepare($query) {
        return new PDOStatementWrapper($this->mysqli, $query);
    }
    
    public function query($query) {
        $result = $this->mysqli->query($query);
        return new PDOStatementWrapper($this->mysqli, null, $result);
    }
    
    public function exec($query) {
        return $this->mysqli->query($query);
    }
    
    public function setAttribute($attr, $value) {
        // Compatibility - ignore PDO attributes
        return true;
    }
}

class PDOStatementWrapper {
    private $mysqli;
    private $stmt;
    private $result;
    
    public function __construct($mysqli, $query = null, $result = null) {
        $this->mysqli = $mysqli;
        if ($query) {
            $this->stmt = $mysqli->prepare($query);
        }
        $this->result = $result;
    }
    
    public function execute($params = []) {
        if (!$this->stmt) return false;
        
        if (!empty($params)) {
            $types = '';
            $values = [];
            foreach ($params as $param) {
                if (is_int($param)) {
                    $types .= 'i';
                } elseif (is_float($param)) {
                    $types .= 'd';
                } else {
                    $types .= 's';
                }
                $values[] = $param;
            }
            $this->stmt->bind_param($types, ...$values);
        }
        
        return $this->stmt->execute();
    }
    
    public function fetch($mode = null) {
        if ($this->result) {
            return $this->result->fetch_assoc();
        }
        if ($this->stmt) {
            $result = $this->stmt->get_result();
            return $result ? $result->fetch_assoc() : false;
        }
        return false;
    }
    
    public function fetchAll($mode = null) {
        if ($this->result) {
            return $this->result->fetch_all(MYSQLI_ASSOC);
        }
        if ($this->stmt) {
            $result = $this->stmt->get_result();
            return $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        }
        return [];
    }
    
    public function rowCount() {
        if ($this->stmt) {
            return $this->stmt->affected_rows;
        }
        return 0;
    }
}

try {
    $pdo = new PDOWrapper($host, $user, $password, $dbname, $port);
    
    // Additional security: set SQL mode
    $pdo->exec("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'");
} catch (Exception $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    die(json_encode(['error' => 'Database connection failed - ensure MySQL is running on localhost']));
}

// Make $pdo available globally (not ideal, but for simplicity)
global $pdo;
?>