<?php
/**
 * Get MT Signs API Endpoint
 * URL: https://signcollect.nl/animDB/getMTSigns.php
 *
 * Queries matched_transcriptions table for records with has_mocap = 1,
 * then scans the GLB directory for corresponding animation files with highest take number.
 * GLB files use naming convention: {base}_{date}_{take}_default.glb
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

// Local path to GLB directory for scanning (GLB files are in the fbx folder)
define('GLB_DIR', '/web/gebarenoverleg_media/fbx/');

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

/**
 * Find the GLB file with the highest take number for a given m_file base name
 * GLB files are named: M20241106_5934_251118_0_default.glb
 *
 * @param string $base Base name (e.g., M20251104_5491)
 * @return array|null ['filename' => string, 'take' => int] or null if not found
 */
function findHighestTakeFile($base) {
    // Look for GLB files with _default.glb suffix
    $pattern = GLB_DIR . $base . '_*_default.glb';
    $files = glob($pattern, GLOB_NOSORT);

    if (empty($files)) {
        // Also try .GLB extension (case insensitive)
        $pattern = GLB_DIR . $base . '_*_default.GLB';
        $files = glob($pattern, GLOB_NOSORT);
    }

    if (empty($files)) {
        return null;
    }

    $highest_take = -1;
    $best_file = null;

    foreach ($files as $file) {
        $filename = basename($file);
        // Extract take number from M20241106_5934_251118_0_default.glb -> 0
        // Pattern: base_date_take_default.glb
        if (preg_match('/_(\d+)_default\.[gG][lL][bB]$/', $filename, $matches)) {
            $take = intval($matches[1]);
            if ($take > $highest_take) {
                $highest_take = $take;
                $best_file = $filename;
            }
        }
    }

    if ($best_file === null) {
        return null;
    }

    return [
        'filename' => $best_file,
        'take' => $highest_take
    ];
}

// Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, null, 'Method not allowed. Use GET.', 405);
}

try {
    // Optional limit parameter
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
    $limit = max(1, min(500, $limit)); // Between 1 and 500

    // Connect to database
    $conn = new mysqli($servername, $username, $password, $database);

    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");

    // Query matched_transcriptions table for records with has_mocap = 1
    $query = "
        SELECT m_file
        FROM matched_transcriptions
        WHERE has_mocap = 1
        LIMIT ?
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $limit);
    $stmt->execute();
    $result = $stmt->get_result();

    $signs = [];
    $not_found = [];

    while ($row = $result->fetch_assoc()) {
        $m_file = $row['m_file'];

        // Extract base name (remove .wav extension)
        $base = pathinfo($m_file, PATHINFO_FILENAME);

        // Find GLB file with highest take number
        $fileInfo = findHighestTakeFile($base);

        if ($fileInfo !== null) {
            $signs[] = [
                'name' => $base,
                'file' => GLB_BASE_URL . $fileInfo['filename'],
                'start' => 0,
                'end' => null,
                'folder' => 'mt',
                'take' => $fileInfo['take'],
                'm_file' => $m_file
            ];
        } else {
            $not_found[] = $base;
        }
    }

    $stmt->close();
    $conn->close();

    // Prepare response
    sendResponse(true, [
        'signs' => $signs,
        'count' => count($signs),
        'not_found' => $not_found,
        'not_found_count' => count($not_found)
    ]);

} catch (Exception $e) {
    if (isset($conn)) {
        $conn->close();
    }

    // Log error for debugging
    error_log('Database error in getMTSigns: ' . $e->getMessage());

    sendResponse(false, null, 'Database error occurred', 500);
}
?>
