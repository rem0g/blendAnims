<?php
/**
 * Get Video File API Endpoint
 * Finds video file matching pattern: {baseName}_RIGHT_*
 *
 * Usage: ?name=M20251104_5480_251126_4
 * Returns: { "success": true, "videoFile": "https://..." }
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

define('VIDEO_BASE_URL', 'https://signcollect.nl/gebarenoverleg_media/razerFiles/');
define('VIDEO_DIR', '/web/gebarenoverleg_media/razerFiles/');

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
        return VIDEO_BASE_URL . basename($files[0]);
    }

    return null;
}

$name = isset($_GET['name']) ? trim($_GET['name']) : '';

if (empty($name)) {
    echo json_encode(['success' => false, 'error' => 'Missing name parameter']);
    exit();
}

$videoUrl = findMatchingVideo($name);

echo json_encode([
    'success' => true,
    'videoFile' => $videoUrl
]);
?>
