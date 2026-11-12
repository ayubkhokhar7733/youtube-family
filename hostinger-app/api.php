<?php
/**
 * Fleet Studio — Server-Side API Controller
 * Securely handles GitHub API communication, uploads, and authentication.
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function send_json($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function get_current_user_profile() {
    global $USERS;
    $uid = $_SESSION['user_id'] ?? null;
    if ($uid && isset($USERS[$uid])) {
        return array_merge(['id' => $uid], $USERS[$uid]);
    }
    return null;
}

function check_auth() {
    $user = get_current_user_profile();
    if (!$user) {
        send_json(['error' => 'Unauthorized. Please sign in to access your channel.'], 401);
    }
    return $user;
}

function get_allowed_channels($user) {
    global $CHANNELS;
    if ($user['is_admin'] || in_array('*', $user['channels'], true)) {
        return array_values($CHANNELS);
    }
    $allowed = [];
    foreach ($user['channels'] as $cid) {
        if (isset($CHANNELS[$cid])) {
            $allowed[] = $CHANNELS[$cid];
        }
    }
    return $allowed;
}

function github_curl($url, $method = 'GET', $body = null) {
    $token = GITHUB_TOKEN;
    if (!$token || $token === 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN') {
        throw new Exception("GitHub Token not configured in Hostinger config.php");
    }

    $ch = curl_init();
    $headers = [
        'User-Agent: Fleet-Studio-Hostinger',
        'Authorization: Bearer ' . $token,
        'Accept: application/vnd.github+json',
        'X-GitHub-Api-Version: 2022-11-28'
    ];

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 120);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    if ($body !== null) {
        $json_payload = is_string($body) ? $body : json_encode($body);
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json_payload);
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new Exception("cURL Error connecting to GitHub: " . $error);
    }

    return ['code' => $http_code, 'body' => json_decode($response, true), 'raw' => $response];
}

function extract_yt_id($url) {
    $url = trim($url);
    if (preg_match('/^[a-zA-Z0-9_-]{11}$/', $url)) return $url;
    if (preg_match('/(?:[?&]v=|youtu\.be\/|\/(?:shorts|live|embed)\/)([a-zA-Z0-9_-]{11})/', $url, $m)) {
        return $m[1];
    }
    return null;
}

function github_upsert_file($repo, $path, $content_bytes, $commit_msg) {
    $api_url = "https://api.github.com/repos/{$repo}/contents/{$path}";
    $get_res = github_curl($api_url . '?ref=main', 'GET');
    $existing_sha = null;
    if ($get_res['code'] === 200 && !empty($get_res['body']['sha'])) {
        $existing_sha = $get_res['body']['sha'];
    }

    $payload = [
        'message' => $commit_msg,
        'content' => base64_encode($content_bytes),
        'branch'  => 'main'
    ];
    if ($existing_sha) {
        $payload['sha'] = $existing_sha;
    }

    $put_res = github_curl($api_url, 'PUT', $payload);
    if ($put_res['code'] < 200 || $put_res['code'] >= 300) {
        $msg = $put_res['body']['message'] ?? $put_res['raw'];
        throw new Exception("GitHub upload failed ({$path}): HTTP {$put_res['code']} - {$msg}");
    }
    return $put_res['body'];
}

function cleanup_stale_audio($repo, $vid) {
    $api_url = "https://api.github.com/repos/{$repo}/contents/data/incoming_audio?ref=main";
    $dir_res = github_curl($api_url, 'GET');
    if ($dir_res['code'] === 200 && is_array($dir_res['body'])) {
        $prefix = "{$vid}_audio.";
        foreach ($dir_res['body'] as $item) {
            if (($item['type'] ?? '') === 'file' && strpos($item['name'] ?? '', $prefix) === 0) {
                github_curl("https://api.github.com/repos/{$repo}/contents/{$item['path']}", 'DELETE', [
                    'message' => "Clean stale incoming audio {$item['name']}",
                    'sha'     => $item['sha'],
                    'branch'  => 'main'
                ]);
            }
        }
    }
}

// ── Action Dispatcher ────────────────────────────────────────────────────────
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'login':
            $username = trim($_POST['username'] ?? '');
            $password = trim($_POST['password'] ?? '');
            if (!$username || !$password) {
                send_json(['error' => 'Please provide both username and password.'], 400);
            }
            if (!isset($USERS[$username]) || $USERS[$username]['password'] !== $password) {
                send_json(['error' => 'Invalid username or password.'], 401);
            }
            $_SESSION['user_id'] = $username;
            send_json([
                'success' => true,
                'user'    => [
                    'id'       => $username,
                    'name'     => $USERS[$username]['name'],
                    'is_admin' => $USERS[$username]['is_admin']
                ]
            ]);
            break;

        case 'logout':
            session_destroy();
            send_json(['success' => true]);
            break;

        case 'channels':
            $user = check_auth();
            $channels = get_allowed_channels($user);
            send_json([
                'user'     => [
                    'id'       => $user['id'],
                    'name'     => $user['name'],
                    'is_admin' => $user['is_admin']
                ],
                'channels' => $channels
            ]);
            break;

        case 'runs':
            $user = check_auth();
            $channel_id = $_GET['channel_id'] ?? '';
            $allowed = get_allowed_channels($user);
            $target = null;
            foreach ($allowed as $c) {
                if ($c['id'] === $channel_id) {
                    $target = $c;
                    break;
                }
            }
            if (!$target) {
                $target = $allowed[0] ?? null;
            }
            if (!$target) {
                send_json(['runs' => []]);
            }

            $workflow = $target['workflow'] ?? 'repurpose.yml';
            $api_url = "https://api.github.com/repos/{$target['repo']}/actions/workflows/{$workflow}/runs?per_page=8";
            $res = github_curl($api_url, 'GET');
            if ($res['code'] === 200) {
                send_json(['runs' => $res['body']['workflow_runs'] ?? []]);
            } else {
                send_json(['runs' => [], 'error' => $res['body']['message'] ?? 'Could not fetch runs'], $res['code']);
            }
            break;

        case 'trigger':
            $user = check_auth();
            $channel_id = $_POST['channel_id'] ?? '';
            $allowed = get_allowed_channels($user);
            $target = null;
            foreach ($allowed as $c) {
                if ($c['id'] === $channel_id) {
                    $target = $c;
                    break;
                }
            }
            if (!$target) {
                send_json(['error' => 'You do not have permission to trigger this channel.'], 403);
            }

            $url = trim($_POST['youtube_url'] ?? '');
            $vid = extract_yt_id($url);
            if (!$vid) {
                send_json(['error' => 'Invalid YouTube video URL or ID.'], 400);
            }

            $repo = $target['repo'];
            $speaker = trim($_POST['speaker_name'] ?? '') ?: $target['speaker'];
            $aspect = $_POST['aspect'] ?? 'landscape';
            $schedule_hours = (string)($_POST['schedule_hours'] ?? $target['schedule_hours'] ?? '72');
            $upload_toggle = (($_POST['upload'] ?? 'true') === 'true') ? 'true' : 'false';
            $privacy = ($schedule_hours === '0') ? 'public' : 'scheduled';

            // 1. Process uploaded Audio File (chunked to 10MB slices if large)
            if (!empty($_FILES['audio_file']['tmp_name']) && is_uploaded_file($_FILES['audio_file']['tmp_name'])) {
                $raw_name = $_FILES['audio_file']['name'];
                $ext = strtolower(pathinfo($raw_name, PATHINFO_EXTENSION)) ?: 'mp3';
                if (!in_array($ext, ['mp3', 'm4a', 'wav', 'webm', 'opus'])) $ext = 'mp3';

                $file_bytes = file_get_contents($_FILES['audio_file']['tmp_name']);
                $total_size = strlen($file_bytes);
                $chunk_size = 10 * 1024 * 1024; // 10 MB

                cleanup_stale_audio($repo, $vid);

                if ($total_size <= $chunk_size) {
                    github_upsert_file($repo, "data/incoming_audio/{$vid}_audio.{$ext}", $file_bytes, "Dashboard upload audio {$vid}");
                } else {
                    $total_parts = ceil($total_size / $chunk_size);
                    for ($i = 0; $i < $total_parts; $i++) {
                        $slice = substr($file_bytes, $i * $chunk_size, $chunk_size);
                        $part_name = sprintf("%s_audio.%s.part%03d", $vid, $ext, $i);
                        github_upsert_file($repo, "data/incoming_audio/{$part_name}", $slice, "Dashboard upload {$part_name}");
                    }
                }
            }

            // 2. Process optional Custom Thumbnail
            if (!empty($_FILES['thumb_file']['tmp_name']) && is_uploaded_file($_FILES['thumb_file']['tmp_name'])) {
                $thumb_bytes = file_get_contents($_FILES['thumb_file']['tmp_name']);
                github_upsert_file($repo, "assets/thumbnails/{$vid}_thumb.jpg", $thumb_bytes, "Dashboard upload thumb {$vid}");
            }

            // 3. Dispatch GitHub Actions Cloud Runner
            $workflow = $target['workflow'] ?? 'repurpose.yml';
            $dispatch_url = "https://api.github.com/repos/{$repo}/actions/workflows/{$workflow}/dispatches";
            $payload = [
                'ref' => 'main',
                'inputs' => [
                    'youtube_url'    => $url,
                    'speaker_name'   => $speaker,
                    'aspect'         => $aspect,
                    'duration'       => '0',
                    'upload'         => $upload_toggle,
                    'privacy'        => $privacy,
                    'schedule_hours' => $schedule_hours
                ]
            ];

            $disp_res = github_curl($dispatch_url, 'POST', $payload);
            if ($disp_res['code'] === 204 || $disp_res['code'] === 200) {
                send_json([
                    'success'  => true,
                    'repo'     => $repo,
                    'channel'  => $target['name'],
                    'actions'  => "https://github.com/{$repo}/actions"
                ]);
            } else {
                $err_msg = $disp_res['body']['message'] ?? $disp_res['raw'];
                send_json(['error' => "GitHub dispatch failed: HTTP {$disp_res['code']} - {$err_msg}"], 500);
            }
            break;

        case 'get_queue':
            $cid = $_GET['channel'] ?? '';
            $target = $CHANNELS[$cid] ?? null;
            if (!$target) {
                send_json(['error' => 'Channel not found'], 404);
            }
            if (!$user['is_admin'] && !in_array('*', $user['channels'], true) && !in_array($cid, $user['channels'], true)) {
                send_json(['error' => 'Access denied to this channel queue'], 403);
            }
            $repo = $target['repo'];
            try {
                $gh_res = github_curl("https://api.github.com/repos/{$repo}/contents/data/queue.json?ref=main");
                if ($gh_res['code'] === 200 && isset($gh_res['body']['content'])) {
                    $json_str = base64_decode($gh_res['body']['content']);
                    send_json(['channel' => $cid, 'queue' => json_decode($json_str, true) ?: []]);
                }
            } catch (Exception $e) {}
            send_json(['channel' => $cid, 'queue' => []]);
            break;

        default:
            send_json(['error' => 'Unknown API action'], 400);
    }
} catch (Exception $e) {
    send_json(['error' => $e->getMessage()], 500);
}
