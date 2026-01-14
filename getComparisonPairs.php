<?php
/**
 * Get Comparison Pairs API Endpoint
 * URL: https://signcollect.nl/animDB/getComparisonPairs.php
 *
 * Scans the post_processed folder for GLB files and finds
 * matching files in the fbx root folder for side-by-side comparison.
 *
 * Example pair:
 *   - fbx/post_processed/SIGN_250228_1.glb (post-processed)
 *   - fbx/SIGN_250228_1.glb (original)
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

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Base URL for GLB files
define('GLB_BASE_URL', 'https://signcollect.nl/gebarenoverleg_media/fbx/');
define('GLB_PP_BASE_URL', 'https://signcollect.nl/gebarenoverleg_media/fbx/post_processed/');

// Local path to GLB directories for scanning
define('GLB_DIR', '/web/gebarenoverleg_media/fbx/');
define('GLB_PP_DIR', '/web/gebarenoverleg_media/fbx/post_processed/');

// Video files location
define('VIDEO_BASE_URL', 'https://signcollect.nl/gebarenoverleg_media/razerFiles/');
define('VIDEO_DIR', '/web/gebarenoverleg_media/razerFiles/');

// PresAnims files location
define('PRES_BASE_URL', 'https://signcollect.nl/presAnims/');
define('PRES_DIR', '/web/presAnims/');

/**
 * Find matching video file for a given base name
 * Video files follow pattern: {baseName}_RIGHT_*.mkv
 */
function findMatchingVideo($baseName) {
    // Look for video files matching the pattern
    $pattern = VIDEO_DIR . $baseName . '_RIGHT_*.mkv';
    $files = glob($pattern, GLOB_NOSORT);

    // Also try .MKV extension
    if (empty($files)) {
        $pattern = VIDEO_DIR . $baseName . '_RIGHT_*.MKV';
        $files = glob($pattern, GLOB_NOSORT);
    }

    // Also try .mp4 extension
    if (empty($files)) {
        $pattern = VIDEO_DIR . $baseName . '_RIGHT_*.mp4';
        $files = glob($pattern, GLOB_NOSORT);
    }

    if (!empty($files)) {
        // Return the first match
        return VIDEO_BASE_URL . basename($files[0]);
    }

    return null;
}

/**
 * Find matching presAnims GLB file for a given base name
 * PresAnims files use format: M20240925_1853.glb
 * Base names are like: M20240925_1853_251118_0
 * So we extract just the first two parts: M20240925_1853
 */
function findMatchingPresAnim($baseName) {
    // Extract first two parts: M20240925_1853_251118_0 -> M20240925_1853
    // Split by underscore and take first two parts
    if (preg_match('/^(M\d+_\d+)/', $baseName, $matches)) {
        $shortName = $matches[1];
    } else {
        $shortName = $baseName;
    }

    // Look for exact match GLB file
    $exactPath = PRES_DIR . $shortName . '.glb';
    if (file_exists($exactPath)) {
        return PRES_BASE_URL . $shortName . '.glb';
    }

    // Try .GLB extension
    $exactPath = PRES_DIR . $shortName . '.GLB';
    if (file_exists($exactPath)) {
        return PRES_BASE_URL . $shortName . '.GLB';
    }

    return null;
}

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
    // Optional search parameter
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    // Optional limit parameter
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 0;
    $limit = max(0, min(1000, $limit)); // 0 = no limit, max 1000

    // Find all GLB files in post_processed folder
    $ppFiles = glob(GLB_PP_DIR . '*.glb', GLOB_NOSORT);

    // Also try uppercase extension
    $ppFilesUpper = glob(GLB_PP_DIR . '*.GLB', GLOB_NOSORT);
    $ppFiles = array_merge($ppFiles, $ppFilesUpper);

    $pairs = [];
    $missingPartner = [];

    foreach ($ppFiles as $ppFile) {
        $ppFilename = basename($ppFile);

        // Base name is just the filename without extension
        $baseName = preg_replace('/\.[gG][lL][bB]$/i', '', $ppFilename);

        // Apply search filter if provided
        if ($search !== '' && stripos($baseName, $search) === false) {
            continue;
        }

        // Look for matching file in fbx root folder (same filename)
        $defaultPath = GLB_DIR . $ppFilename;

        // Also check uppercase extension
        if (!file_exists($defaultPath)) {
            $altFilename = $baseName . '.GLB';
            $defaultPath = GLB_DIR . $altFilename;
        }

        if (file_exists($defaultPath)) {
            // Find matching video file
            $videoUrl = findMatchingVideo($baseName);

            // Find matching presAnims file
            $presAnimUrl = findMatchingPresAnim($baseName);

            $pairs[] = [
                'name' => $baseName,
                'displayName' => $baseName,
                'ppFile' => GLB_PP_BASE_URL . $ppFilename,
                'defaultFile' => GLB_BASE_URL . basename($defaultPath),
                'ppFilename' => $ppFilename,
                'defaultFilename' => basename($defaultPath),
                'videoFile' => $videoUrl,
                'presAnimFile' => $presAnimUrl
            ];
        } else {
            $missingPartner[] = $ppFilename;
        }
    }

    // Sort pairs by name
    usort($pairs, function($a, $b) {
        return strcmp($a['name'], $b['name']);
    });

    // Apply limit if specified
    if ($limit > 0 && count($pairs) > $limit) {
        $pairs = array_slice($pairs, 0, $limit);
    }

    sendResponse(true, [
        'pairs' => $pairs,
        'count' => count($pairs),
        'missingPartner' => $missingPartner,
        'missingCount' => count($missingPartner)
    ]);

} catch (Exception $e) {
    error_log('Error in getComparisonPairs: ' . $e->getMessage());
    sendResponse(false, null, 'Server error occurred', 500);
}
?>
