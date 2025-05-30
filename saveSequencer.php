<?php
/**
 * Save Sequencer API Endpoint
 * URL: https://signcollect.nl/animDB/saveSequencer.php
 * 
 * Saves sign language animation sequences to the database
 */

// CORS headers for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = 'localhost';
$dbname = 'sign_sequencer';
$username = 'your_username'; // Update with actual credentials
$password = 'your_password'; // Update with actual credentials

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Response helper function
function sendResponse($success, $data = null, $error = null, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ]);
    exit();
}

// Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, null, 'Method not allowed. Use POST.', 405);
}

// Get and validate input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    sendResponse(false, null, 'Invalid JSON input', 400);
}

// Validate required fields
if (!isset($input['sequence_name']) || empty($input['sequence_name'])) {
    sendResponse(false, null, 'sequence_name is required', 400);
}

if (!isset($input['items']) || !is_array($input['items']) || empty($input['items'])) {
    sendResponse(false, null, 'items array is required and must not be empty', 400);
}

try {
    // Connect to database
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Start transaction
    $pdo->beginTransaction();
    
    // Check if updating existing sequence
    $sequence_id = isset($input['sequence_id']) ? intval($input['sequence_id']) : null;
    
    if ($sequence_id) {
        // Update existing sequence
        $stmt = $pdo->prepare("
            UPDATE sequences 
            SET sequence_name = :sequence_name, 
                user_id = :user_id,
                metadata = :metadata,
                updated_at = NOW()
            WHERE id = :id
        ");
        
        $stmt->execute([
            ':sequence_name' => $input['sequence_name'],
            ':user_id' => isset($input['user_id']) ? $input['user_id'] : null,
            ':metadata' => isset($input['metadata']) ? json_encode($input['metadata']) : null,
            ':id' => $sequence_id
        ]);
        
        // Delete existing items for this sequence
        $stmt = $pdo->prepare("DELETE FROM sequence_items WHERE sequence_id = :sequence_id");
        $stmt->execute([':sequence_id' => $sequence_id]);
    } else {
        // Insert new sequence
        $stmt = $pdo->prepare("
            INSERT INTO sequences (sequence_name, user_id, metadata) 
            VALUES (:sequence_name, :user_id, :metadata)
        ");
        
        $stmt->execute([
            ':sequence_name' => $input['sequence_name'],
            ':user_id' => isset($input['user_id']) ? $input['user_id'] : null,
            ':metadata' => isset($input['metadata']) ? json_encode($input['metadata']) : null
        ]);
        
        $sequence_id = $pdo->lastInsertId();
    }
    
    // Insert sequence items
    $stmt = $pdo->prepare("
        INSERT INTO sequence_items 
        (sequence_id, position, sign_name, frame_start, frame_end, take_number, item_data) 
        VALUES (:sequence_id, :position, :sign_name, :frame_start, :frame_end, :take_number, :item_data)
    ");
    
    foreach ($input['items'] as $position => $item) {
        // Validate item fields
        if (!isset($item['sign_name']) || empty($item['sign_name'])) {
            throw new Exception("Item at position $position is missing sign_name");
        }
        
        $stmt->execute([
            ':sequence_id' => $sequence_id,
            ':position' => $position,
            ':sign_name' => $item['sign_name'],
            ':frame_start' => isset($item['frame_start']) ? intval($item['frame_start']) : 0,
            ':frame_end' => isset($item['frame_end']) ? intval($item['frame_end']) : 100,
            ':take_number' => isset($item['take_number']) ? intval($item['take_number']) : 1,
            ':item_data' => isset($item['item_data']) ? json_encode($item['item_data']) : null
        ]);
    }
    
    // Commit transaction
    $pdo->commit();
    
    sendResponse(true, [
        'sequence_id' => $sequence_id,
        'message' => 'Sequence saved successfully',
        'items_count' => count($input['items'])
    ]);
    
} catch (PDOException $e) {
    // Rollback transaction on database error
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    // Log error for debugging (in production, log to file instead)
    error_log('Database error: ' . $e->getMessage());
    
    sendResponse(false, null, 'Database error occurred', 500);
    
} catch (Exception $e) {
    // Rollback transaction on validation error
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    sendResponse(false, null, $e->getMessage(), 400);
}
?>