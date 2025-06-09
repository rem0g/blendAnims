<?php
/**
 * Senses to Gloss API Endpoint
 * URL: https://signcollect.nl/animDB/sensesToGlos.php
 * 
 * Searches for words in the senses_dutch JSON field and returns corresponding animations
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

// Include database configuration
require_once '../mysql_config.php';

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Base URL for GLB files
define('GLB_BASE_URL', 'https://signcollect.nl/gebarenoverleg_media/fbx/');

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
    // Get and validate parameters
    if (!isset($_GET['text']) || empty(trim($_GET['text']))) {
        sendResponse(false, null, 'Missing required parameter: text', 400);
    }
    
    $text = trim($_GET['text']);
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 5;
    
    // Validate limit
    $limit = max(1, min(10, $limit)); // Between 1 and 10
    
    // Limit text length to prevent abuse
    if (strlen($text) > 500) {
        sendResponse(false, null, 'Text too long. Maximum 500 characters allowed.', 400);
    }
    
    // Connect to database
    $conn = new mysqli($servername, $username, $password, $database);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    $conn->set_charset("utf8mb4");
    
    // Split text into words and clean them
    // Remove punctuation and convert to lowercase
    $words = preg_split('/\s+/', $text);
    $processed_words = [];
    
    foreach ($words as $word) {
        // Remove punctuation from beginning and end
        $clean_word = trim(preg_replace('/^[^\w]+|[^\w]+$/u', '', $word));
        if (!empty($clean_word)) {
            $processed_words[] = mb_strtolower($clean_word, 'UTF-8');
        }
    }
    
    // Remove duplicates while preserving order
    $unique_words = array_values(array_unique($processed_words));
    
    // Limit number of words to process
    $unique_words = array_slice($unique_words, 0, 50);
    
    $results = [];
    $total_found = 0;
    $animations_found = 0;
    
    // Process each word
    foreach ($unique_words as $word) {
        $word_result = [
            'word' => $word,
            'gloss' => null,
            'animations' => [],
            'status' => 'NOT_FOUND'
        ];
        
        // Search for word in senses_dutch JSON field
        // Since senses_dutch contains comma-separated values, we need to search within them
        $search_pattern = '%' . $word . '%';
        
        // Use a query that searches for the word within the JSON values
        // Don't limit the SQL query - we'll limit matches instead
        $query = "
            SELECT lemma_id_gloss_dutch, senses_dutch
            FROM sb_records 
            WHERE senses_dutch LIKE ?
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param('s', $search_pattern);
        $stmt->execute();
        $result = $stmt->get_result();
        
        // Collect ALL glosses that contain this word
        $found_glosses = [];
        
        // Check each result to see if the word matches exactly within comma-separated values
        while ($row = $result->fetch_assoc()) {
            $senses = json_decode($row['senses_dutch'], true);
            if ($senses && is_array($senses)) {
                foreach ($senses as $key => $value) {
                    // Split by comma and check each part
                    $parts = array_map('trim', explode(',', $value));
                    foreach ($parts as $part) {
                        if (mb_strtolower($part, 'UTF-8') === $word) {
                            $found_glosses[] = $row['lemma_id_gloss_dutch'];
                            break 2; // Break out of inner loops but continue searching other records
                        }
                    }
                }
            }
        }
        
        $stmt->close();
        
        if (!empty($found_glosses)) {
            // Store all found glosses
            $word_result['gloss'] = implode(', ', $found_glosses);
            $word_result['status'] = 'FOUND';
            $total_found++;
            
            // Now search for animations using ALL found glosses
            // Include timing data (start and end times) for proper frame conversion
            $placeholders = str_repeat('?,', count($found_glosses) - 1) . '?';
            $anim_query = "
                SELECT filename, glos, startTime, endTime
                FROM mocap_files 
                WHERE glos IN ($placeholders)
                LIMIT ?
            ";
            
            $anim_stmt = $conn->prepare($anim_query);
            
            // Prepare parameters for bind_param
            $types = str_repeat('s', count($found_glosses)) . 'i';
            $params = array_merge($found_glosses, [$limit]);
            
            // Create references for bind_param
            $refs = [];
            foreach ($params as $key => $value) {
                $refs[$key] = &$params[$key];
            }
            
            // Bind parameters
            array_unshift($refs, $types);
            call_user_func_array([$anim_stmt, 'bind_param'], $refs);
            
            $anim_stmt->execute();
            $anim_result = $anim_stmt->get_result();
            
            while ($anim_row = $anim_result->fetch_assoc()) {
                // Replace .fbx with .glb
                $filename = str_replace('.fbx', '.glb', $anim_row['filename']);
                
                // Include timing data for frame conversion (same as sign search API)
                $word_result['animations'][] = [
                    'filename' => $filename,
                    'file_url' => GLB_BASE_URL . $filename,
                    'gloss' => $anim_row['glos'], // Include which gloss this animation belongs to
                    'startTime' => $anim_row['startTime'], // Timing data for frame conversion
                    'endTime' => $anim_row['endTime'], // Timing data for frame conversion
                    'originalStartTime' => $anim_row['startTime'], // Store original timing
                    'originalEndTime' => $anim_row['endTime'] // Store original timing
                ];
                $animations_found++;
            }
            
            if (empty($word_result['animations'])) {
                $word_result['status'] = 'GLB_NOT_FOUND';
            }
            
            $anim_stmt->close();
        } else {
            // No direct match found - try lemmatization as last resort
            $lemma_query = "SELECT lemma FROM hh_words WHERE word = ? LIMIT 1";
            $lemma_stmt = $conn->prepare($lemma_query);
            $lemma_stmt->bind_param('s', $word);
            $lemma_stmt->execute();
            $lemma_result = $lemma_stmt->get_result();
            
            if ($lemma_row = $lemma_result->fetch_assoc()) {
                $lemma = mb_strtolower($lemma_row['lemma'], 'UTF-8');
                $word_result['lemmatized_from'] = $word;
                $word_result['lemma'] = $lemma;
                
                // Now search for the lemma in senses_dutch
                $lemma_search_pattern = '%' . $lemma . '%';
                $lemma_senses_query = "
                    SELECT lemma_id_gloss_dutch, senses_dutch
                    FROM sb_records 
                    WHERE senses_dutch LIKE ?
                ";
                
                $lemma_senses_stmt = $conn->prepare($lemma_senses_query);
                $lemma_senses_stmt->bind_param('s', $lemma_search_pattern);
                $lemma_senses_stmt->execute();
                $lemma_senses_result = $lemma_senses_stmt->get_result();
                
                $lemma_found_glosses = [];
                
                // Check each result for the lemma
                while ($row = $lemma_senses_result->fetch_assoc()) {
                    $senses = json_decode($row['senses_dutch'], true);
                    if ($senses && is_array($senses)) {
                        foreach ($senses as $key => $value) {
                            $parts = array_map('trim', explode(',', $value));
                            foreach ($parts as $part) {
                                if (mb_strtolower($part, 'UTF-8') === $lemma) {
                                    $lemma_found_glosses[] = $row['lemma_id_gloss_dutch'];
                                    break 2;
                                }
                            }
                        }
                    }
                }
                
                $lemma_senses_stmt->close();
                
                if (!empty($lemma_found_glosses)) {
                    // Found glosses using lemma
                    $word_result['gloss'] = implode(', ', $lemma_found_glosses);
                    $word_result['status'] = 'FOUND_VIA_LEMMA';
                    $total_found++;
                    
                    // Search for animations using lemma glosses
                    // Include timing data (start and end times) for proper frame conversion
                    $placeholders = str_repeat('?,', count($lemma_found_glosses) - 1) . '?';
                    $anim_query = "
                        SELECT filename, glos, startTime, endTime
                        FROM mocap_files 
                        WHERE glos IN ($placeholders)
                        LIMIT ?
                    ";
                    
                    $anim_stmt = $conn->prepare($anim_query);
                    
                    $types = str_repeat('s', count($lemma_found_glosses)) . 'i';
                    $params = array_merge($lemma_found_glosses, [$limit]);
                    
                    $refs = [];
                    foreach ($params as $key => $value) {
                        $refs[$key] = &$params[$key];
                    }
                    
                    array_unshift($refs, $types);
                    call_user_func_array([$anim_stmt, 'bind_param'], $refs);
                    
                    $anim_stmt->execute();
                    $anim_result = $anim_stmt->get_result();
                    
                    while ($anim_row = $anim_result->fetch_assoc()) {
                        $filename = str_replace('.fbx', '.glb', $anim_row['filename']);
                        
                        // Include timing data for frame conversion (same as sign search API)
                        $word_result['animations'][] = [
                            'filename' => $filename,
                            'file_url' => GLB_BASE_URL . $filename,
                            'gloss' => $anim_row['glos'],
                            'startTime' => $anim_row['startTime'], // Timing data for frame conversion
                            'endTime' => $anim_row['endTime'], // Timing data for frame conversion
                            'originalStartTime' => $anim_row['startTime'], // Store original timing
                            'originalEndTime' => $anim_row['endTime'] // Store original timing
                        ];
                        $animations_found++;
                    }
                    
                    if (empty($word_result['animations'])) {
                        $word_result['status'] = 'GLB_NOT_FOUND_VIA_LEMMA';
                    }
                    
                    $anim_stmt->close();
                }
            }
            
            $lemma_stmt->close();
        }
        
        $results[] = $word_result;
    }
    
    $conn->close();
    
    // Prepare response
    sendResponse(true, [
        'input_text' => $text,
        'words' => $results,
        'summary' => [
            'total_words' => count($results),
            'found_words' => $total_found,
            'animations_found' => $animations_found
        ]
    ]);
    
} catch (Exception $e) {
    if (isset($conn)) {
        $conn->close();
    }
    
    // Log error for debugging
    error_log('Database error in sensesToGlos: ' . $e->getMessage());
    
    sendResponse(false, null, 'Database error occurred', 500);
}
?>