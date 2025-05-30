<?php
/**
 * Get Sequencer API Endpoint
 * URL: https://signcollect.nl/animDB/getSequencer.php
 * 
 * Retrieves sign language animation sequences from the database
 */

// CORS headers for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, null, 'Method not allowed. Use GET.', 405);
}

try {
    // Connect to database
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get query parameters
    $sequence_id = isset($_GET['id']) ? intval($_GET['id']) : null;
    $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : null;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    $search = isset($_GET['search']) ? $_GET['search'] : null;
    
    // Validate limit and offset
    $limit = max(1, min(100, $limit)); // Between 1 and 100
    $offset = max(0, $offset);
    
    // Build query
    $where_conditions = [];
    $params = [];
    
    if ($sequence_id) {
        $where_conditions[] = "s.id = :sequence_id";
        $params[':sequence_id'] = $sequence_id;
    }
    
    if ($user_id) {
        $where_conditions[] = "s.user_id = :user_id";
        $params[':user_id'] = $user_id;
    }
    
    if ($search) {
        $where_conditions[] = "s.sequence_name LIKE :search";
        $params[':search'] = '%' . $search . '%';
    }
    
    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';
    
    // Get total count
    $count_query = "SELECT COUNT(*) as total FROM sequences s $where_clause";
    $stmt = $pdo->prepare($count_query);
    $stmt->execute($params);
    $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Get sequences
    $query = "
        SELECT 
            s.id,
            s.sequence_name,
            s.created_at,
            s.updated_at,
            s.user_id,
            s.metadata
        FROM sequences s
        $where_clause
        ORDER BY s.updated_at DESC
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $pdo->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $sequences = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get items for each sequence
    $sequence_ids = array_column($sequences, 'id');
    $result = [];
    
    if (!empty($sequence_ids)) {
        $placeholders = implode(',', array_fill(0, count($sequence_ids), '?'));
        $items_query = "
            SELECT 
                sequence_id,
                position,
                sign_name,
                frame_start,
                frame_end,
                take_number,
                item_data
            FROM sequence_items
            WHERE sequence_id IN ($placeholders)
            ORDER BY sequence_id, position
        ";
        
        $stmt = $pdo->prepare($items_query);
        $stmt->execute($sequence_ids);
        $all_items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Group items by sequence_id
        $items_by_sequence = [];
        foreach ($all_items as $item) {
            $seq_id = $item['sequence_id'];
            unset($item['sequence_id']);
            
            // Parse JSON fields
            if ($item['item_data']) {
                $item['item_data'] = json_decode($item['item_data'], true);
            }
            
            $items_by_sequence[$seq_id][] = $item;
        }
        
        // Build final result
        foreach ($sequences as $sequence) {
            // Parse metadata JSON
            if ($sequence['metadata']) {
                $sequence['metadata'] = json_decode($sequence['metadata'], true);
            }
            
            // Add items to sequence
            $sequence['items'] = isset($items_by_sequence[$sequence['id']]) 
                ? $items_by_sequence[$sequence['id']] 
                : [];
            
            $result[] = $sequence;
        }
    }
    
    sendResponse(true, [
        'sequences' => $result,
        'total' => intval($total),
        'limit' => $limit,
        'offset' => $offset
    ]);
    
} catch (PDOException $e) {
    // Log error for debugging (in production, log to file instead)
    error_log('Database error: ' . $e->getMessage());
    
    sendResponse(false, null, 'Database error occurred', 500);
    
} catch (Exception $e) {
    sendResponse(false, null, $e->getMessage(), 400);
}
?>