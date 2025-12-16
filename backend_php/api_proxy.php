<?php
// API Proxy - forwards requests to working server
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Working backend server
$target_server = 'https://test.rodline.co.tz';

// Get the request path
$path = $_SERVER['REQUEST_URI'];
$path = str_replace('/backend_php/api_proxy.php', '', $path);

// Build target URL
$target_url = $target_server . $path;

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Initialize cURL
$ch = curl_init($target_url);

// Set cURL options
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

// Forward request body for POST/PUT
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// Forward headers
$headers = [];
foreach (getallheaders() as $key => $value) {
    if (!in_array(strtolower($key), ['host', 'connection'])) {
        $headers[] = "$key: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Execute request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Return response
http_response_code($http_code);
echo $response;
?>
