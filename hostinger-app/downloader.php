<?php
/**
 * Fleet Studio — Hostinger YouTube to MP3 Downloader & Cloud Bridge
 * 
 * Acts as an invisible background engine for Fleet Studio on Vercel:
 * 1. Receives YouTube reference URL from Vercel Studio
 * 2. Downloads MP3 without Vercel's 4.5MB serverless limits
 * 3. Commits MP3 chunks directly to GitHub repository (data/incoming_audio/)
 * 4. Tells Vercel to launch the Azure cloud runner with zero YouTube bot-blocks!
 */

ini_set('display_errors', 0);
ini_set('max_execution_time', 300);
ini_set('memory_limit', '512M');
error_reporting(E_ALL);

// Allow CORS from Vercel and local studio
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

function json_out($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function extract_yt_id($url) {
    if (preg_match('/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/', $url, $m)) {
        return $m[1];
    }
    return null;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Check server capabilities (yt-dlp, python, exec)
if ($action === 'status') {
    $exec_allowed = function_exists('exec') && !in_array('exec', array_map('trim', explode(',', ini_get('disable_functions'))));
    $python_found = false;
    $ytdlp_found = false;

    if ($exec_allowed) {
        @exec('python3 --version 2>&1', $py_out, $py_code);
        $python_found = ($py_code === 0);

        @exec('yt-dlp --version 2>&1', $yt_out, $yt_code);
        $ytdlp_found = ($yt_code === 0);
        if (!$ytdlp_found && file_exists(__DIR__ . '/bin/yt-dlp')) {
            $ytdlp_found = true;
        }
    }

    json_out([
        'status'        => 'online',
        'exec_enabled'  => $exec_allowed,
        'python_found'  => $python_found,
        'ytdlp_found'   => $ytdlp_found,
        'max_exec_time' => ini_get('max_execution_time'),
        'upload_max'    => ini_get('upload_max_filesize'),
        'post_max'      => ini_get('post_max_size')
    ]);
}

// 1-Click Stream to Browser (if family member wants to download MP3 directly to device)
if ($action === 'stream_mp3') {
    $url = $_GET['url'] ?? '';
    $vid = extract_yt_id($url);
    if (!$vid) {
        json_out(['error' => 'Invalid YouTube URL'], 400);
    }

    $temp_dir = sys_get_temp_dir() . '/fleet_' . $vid;
    @mkdir($temp_dir, 0777, true);
    $out_pattern = $temp_dir . '/%(id)s.%(ext)s';

    $cmd = "yt-dlp -x --audio-format mp3 --extractor-args 'youtube:player_client=android,web' -o " . escapeshellarg($out_pattern) . " " . escapeshellarg($url);
    @exec($cmd . " 2>&1", $cmd_out, $ret);

    $files = glob($temp_dir . '/*.mp3');
    if ($ret === 0 && !empty($files) && file_exists($files[0])) {
        $mp3 = $files[0];
        header('Content-Type: audio/mpeg');
        header('Content-Disposition: attachment; filename="' . $vid . '_audio.mp3"');
        header('Content-Length: ' . filesize($mp3));
        readfile($mp3);
        @unlink($mp3);
        @rmdir($temp_dir);
        exit;
    } else {
        json_out(['error' => 'Failed to extract audio on server', 'details' => implode("\n", $cmd_out)], 500);
    }
}

// Invisible 2-Way Pipeline: Download on Hostinger -> Push directly to GitHub repo
if ($action === 'download_and_cache' || $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw_input = file_get_contents('php://input');
    $input = json_decode($raw_input, true) ?: $_POST;

    $url = $input['url'] ?? '';
    $channel_id = $input['channel'] ?? '';
    $repo = $input['repo'] ?? '';
    $gh_token = $input['gh_token'] ?? GITHUB_TOKEN;

    if (!$url) {
        json_out(['error' => 'Missing YouTube URL'], 400);
    }
    $vid = extract_yt_id($url);
    if (!$vid) {
        json_out(['error' => 'Invalid YouTube Video ID'], 400);
    }

    if (!$repo && $channel_id && isset($CHANNELS[$channel_id])) {
        $repo = $CHANNELS[$channel_id]['repo'];
    }

    if (!$repo) {
        json_out(['error' => 'Missing channel repository mapping'], 400);
    }

    // Step 1: Download Audio on Hostinger
    $temp_dir = sys_get_temp_dir() . '/fleet_cache_' . $vid . '_' . time();
    @mkdir($temp_dir, 0777, true);
    $out_pattern = $temp_dir . '/%(id)s.%(ext)s';

    // Check yt-dlp binary (system or local bin)
    $ytdlp_bin = 'yt-dlp';
    if (file_exists(__DIR__ . '/bin/yt-dlp')) {
        $ytdlp_bin = __DIR__ . '/bin/yt-dlp';
    }

    $cmd = "$ytdlp_bin -x --audio-format mp3 --extractor-args 'youtube:player_client=android,web' -o " . escapeshellarg($out_pattern) . " " . escapeshellarg($url);
    @exec($cmd . " 2>&1", $cmd_out, $ret);

    $files = glob($temp_dir . '/*.mp3');
    if ($ret !== 0 || empty($files) || !file_exists($files[0])) {
        // Fallback: check for any audio extension (.m4a, .webm, .opus)
        $files = glob($temp_dir . '/*.*');
        $files = array_filter($files, function($f) {
            return preg_match('/\.(mp3|m4a|webm|opus|wav)$/i', $f);
        });
    }

    if (empty($files) || !file_exists(reset($files))) {
        json_out([
            'error'   => 'Hostinger audio download failed. (Tip: yt-dlp must be enabled on Hostinger)',
            'details' => implode("\n", $cmd_out)
        ], 500);
    }

    $audio_file = reset($files);
    $file_bytes = file_get_contents($audio_file);
    $total_size = strlen($file_bytes);
    $ext = pathinfo($audio_file, PATHINFO_EXTENSION) ?: 'mp3';

    // Step 2: Push MP3 chunks directly to GitHub (Bypasses Vercel's 4.5MB limit entirely!)
    require_once __DIR__ . '/api.php'; // Reuse github_upsert_file and chunking
    
    $chunk_size = 10 * 1024 * 1024; // 10 MB per chunk for GitHub API stability
    cleanup_stale_audio($repo, $vid);

    if ($total_size <= $chunk_size) {
        github_upsert_file($repo, "data/incoming_audio/{$vid}_audio.{$ext}", $file_bytes, "Hostinger Downloader: Cache {$vid}");
    } else {
        $total_parts = ceil($total_size / $chunk_size);
        for ($i = 0; $i < $total_parts; $i++) {
            $slice = substr($file_bytes, $i * $chunk_size, $chunk_size);
            $part_name = sprintf("%s_audio.%s.part%03d", $vid, $ext, $i);
            github_upsert_file($repo, "data/incoming_audio/{$part_name}", $slice, "Hostinger Downloader: {$part_name}");
        }
    }

    // Cleanup temp
    @unlink($audio_file);
    @rmdir($temp_dir);

    json_out([
        'success'     => true,
        'message'     => 'Audio extracted on Hostinger and committed directly to GitHub!',
        'video_id'    => $vid,
        'repo'        => $repo,
        'audio_size'  => round($total_size / (1024 * 1024), 2) . ' MB',
        'audio_cached'=> true
    ]);
}

json_out(['error' => 'Unknown action'], 400);
