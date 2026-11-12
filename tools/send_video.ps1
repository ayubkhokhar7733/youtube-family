param(
    [string]$YoutubeUrl = "",
    [string]$ThumbPath = "",
    [switch]$Setup
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ConfigPath = Join-Path $env:USERPROFILE ".youtube_family_owner.json"
$ChunkSize = 10 * 1024 * 1024 # 10 MB raw per GitHub Contents API PUT

function Extract-YoutubeId([string]$Url) {
    $u = $Url.Trim()
    if ($u -match '^[a-zA-Z0-9_-]{11}$') { return $u }
    $patterns = @(
        '[?&]v=([a-zA-Z0-9_-]{11})',
        'youtu\.be/([a-zA-Z0-9_-]{11})',
        'youtube\.com/(?:shorts|live|embed)/([a-zA-Z0-9_-]{11})'
    )
    foreach ($p in $patterns) {
        if ($u -match $p) { return $Matches[1] }
    }
    return ""
}

function Invoke-GitHubApi([string]$Method, [string]$Uri, [string]$Token, $BodyObj = $null) {
    $headers = @{
        "Authorization"        = "Bearer $Token"
        "Accept"               = "application/vnd.github+json"
        "X-GitHub-Api-Version" = "2022-11-28"
    }
    $params = @{
        Method  = $Method
        Uri     = $Uri
        Headers = $headers
    }
    if ($null -ne $BodyObj) {
        $params["ContentType"] = "application/json; charset=utf-8"
        $params["Body"] = ($BodyObj | ConvertTo-Json -Depth 6 -Compress)
    }
    return Invoke-RestMethod @params
}

function Upsert-GitHubFile([string]$Repo, [string]$RepoPath, [byte[]]$Bytes, [string]$CommitMsg, [string]$Token) {
    $apiUrl = "https://api.github.com/repos/$Repo/contents/$RepoPath"
    $existingSha = $null
    try {
        $existing = Invoke-GitHubApi -Method "GET" -Uri "${apiUrl}?ref=main" -Token $Token
        if ($existing -and $existing.sha) { $existingSha = $existing.sha }
    } catch {
        # 404 expected when file does not exist yet
    }

    $payload = @{
        message = $CommitMsg
        content = [Convert]::ToBase64String($Bytes)
        branch  = "main"
    }
    if ($existingSha) { $payload["sha"] = $existingSha }

    return Invoke-GitHubApi -Method "PUT" -Uri $apiUrl -Token $Token -BodyObj $payload
}

function Cleanup-StaleAudio([string]$Repo, [string]$Vid, [string]$Token) {
    try {
        $items = Invoke-GitHubApi -Method "GET" -Uri "https://api.github.com/repos/$Repo/contents/data/incoming_audio?ref=main" -Token $Token
        if ($items -is [System.Array]) {
            foreach ($item in $items) {
                if ($item.type -eq "file" -and $item.name.StartsWith("${Vid}_audio.")) {
                    Invoke-GitHubApi -Method "DELETE" -Uri "https://api.github.com/repos/$Repo/contents/$($item.path)" -Token $Token -BodyObj @{
                        message = "Clean stale incoming audio $($item.name)"
                        sha     = $item.sha
                        branch  = "main"
                    } | Out-Null
                }
            }
        }
    } catch {
        # Folder may not exist yet
    }
}

function Ensure-Config {
    if (-not $Setup -and (Test-Path $ConfigPath)) {
        try {
            $cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
            if ($cfg.repo -and $cfg.token) { return $cfg }
        } catch {}
    }

    Write-Host ""
    Write-Host "=== YouTube Family Cloud Sender Setup ===" -ForegroundColor Yellow
    Write-Host "Select your channel or choose Custom:"
    Write-Host "  1) Habitos de Acero (ayubkhokhar7733/channel-habitos-acero)"
    Write-Host "  2) Mejora Dia a Dia (ayubkhokhar7733/channel-mejora-dia-a-dia)"
    Write-Host "  3) Custom GitHub Repo"
    $choice = Read-Host "Enter 1, 2, or 3"

    $repo = ""
    $speaker = ""
    switch ($choice.Trim()) {
        "1" { $repo = "ayubkhokhar7733/channel-habitos-acero"; $speaker = "Mario Alonso Puig" }
        "2" { $repo = "ayubkhokhar7733/channel-mejora-dia-a-dia"; $speaker = "Dra. Nazareth Castellanos" }
        default {
            $repo = (Read-Host "GitHub Repo (owner/repo)").Trim()
            $speaker = (Read-Host "Default Speaker Name").Trim()
        }
    }

    $sched = (Read-Host "Schedule gap hours [72 = every 3 days]").Trim()
    if (-not $sched) { $sched = "72" }

    $secToken = Read-Host "Paste your GitHub Fine-Grained Token (for $repo)" -AsSecureString
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secToken)
    $plainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr).Trim()
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

    if (-not $repo -or -not $plainToken) {
        throw "Repository and GitHub Token are required."
    }

    $cfgObj = [PSCustomObject]@{
        repo           = $repo
        speaker        = $speaker
        schedule_hours = $sched
        token          = $plainToken
    }
    $cfgObj | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8
    Write-Host "Saved setup to $ConfigPath" -ForegroundColor Green
    return $cfgObj
}

$cfg = Ensure-Config

if (-not $YoutubeUrl) {
    $YoutubeUrl = (Read-Host "`nPaste YouTube Video URL").Trim()
}
$vid = Extract-YoutubeId $YoutubeUrl
if (-not $vid) {
    throw "Could not extract an 11-character YouTube Video ID from: $YoutubeUrl"
}

if (-not $ThumbPath) {
    $inputThumb = (Read-Host "Optional custom thumbnail path (.jpg/.png, press Enter to skip)").Trim('"').Trim()
    if ($inputThumb) { $ThumbPath = $inputThumb }
}

$tempBase = Join-Path $env:TEMP "ytfam_${vid}"
$mp3Path = "${tempBase}.mp3"
if (Test-Path $mp3Path) { Remove-Item $mp3Path -Force }

Write-Host "`n[1/4] Downloading clean MP3 locally on your connection ($vid)..." -ForegroundColor Cyan
$ytDlpExe = Get-Command yt-dlp -ErrorAction SilentlyContinue
if ($ytDlpExe) {
    & $ytDlpExe.Source -x --audio-format mp3 --audio-quality 192K --no-playlist -o "${tempBase}.%(ext)s" $YoutubeUrl
} else {
    & python -m yt_dlp -x --audio-format mp3 --audio-quality 192K --no-playlist -o "${tempBase}.%(ext)s" $YoutubeUrl
}
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $mp3Path)) {
    throw "yt-dlp failed to download audio. Install yt-dlp + ffmpeg (winget install yt-dlp.yt-dlp) and retry."
}

$fileBytes = [System.IO.File]::ReadAllBytes($mp3Path)
$sizeMB = [Math]::Round($fileBytes.Length / 1MB, 2)
Write-Host "Downloaded MP3 ($sizeMB MB)" -ForegroundColor Green

Write-Host "[2/4] Fetching real video title metadata via oEmbed..." -ForegroundColor Cyan
try {
    $oembed = Invoke-RestMethod -Uri "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$vid&format=json" -TimeoutSec 15
    $infoBytes = [System.Text.Encoding]::UTF8.GetBytes(($oembed | ConvertTo-Json -Depth 4))
    Upsert-GitHubFile -Repo $cfg.repo -RepoPath "data/incoming_audio/${vid}_info.json" -Bytes $infoBytes -CommitMsg "Upload metadata $vid" -Token $cfg.token | Out-Null
} catch {
    Write-Host "oEmbed fetch skipped (runner will fetch metadata automatically)." -ForegroundColor DarkGray
}

Write-Host "[3/4] Uploading audio to $($cfg.repo)..." -ForegroundColor Cyan
Cleanup-StaleAudio -Repo $cfg.repo -Vid $vid -Token $cfg.token

if ($fileBytes.Length -le $ChunkSize) {
    Upsert-GitHubFile -Repo $cfg.repo -RepoPath "data/incoming_audio/${vid}_audio.mp3" -Bytes $fileBytes -CommitMsg "Local upload audio $vid" -Token $cfg.token | Out-Null
} else {
    $totalParts = [Math]::Ceiling($fileBytes.Length / $ChunkSize)
    for ($i = 0; $i -lt $totalParts; $i++) {
        $start = $i * $ChunkSize
        $len = [Math]::Min($ChunkSize, $fileBytes.Length - $start)
        $partBytes = New-Object byte[] $len
        [Array]::Copy($fileBytes, $start, $partBytes, 0, $len)
        $partName = "{0}_audio.mp3.part{1:D3}" -f $vid, $i
        Write-Host ("  Uploading chunk {0}/{1}..." -f ($i + 1), $totalParts)
        Upsert-GitHubFile -Repo $cfg.repo -RepoPath "data/incoming_audio/$partName" -Bytes $partBytes -CommitMsg "Local upload $partName" -Token $cfg.token | Out-Null
    }
}

if ($ThumbPath -and (Test-Path $ThumbPath)) {
    Write-Host "  Uploading custom thumbnail..." -ForegroundColor Cyan
    $thumbBytes = [System.IO.File]::ReadAllBytes($ThumbPath)
    Upsert-GitHubFile -Repo $cfg.repo -RepoPath "assets/thumbnails/${vid}_thumb.jpg" -Bytes $thumbBytes -CommitMsg "Local upload thumb $vid" -Token $cfg.token | Out-Null
}

Write-Host "[4/4] Triggering Cloud Video Pipeline on $($cfg.repo)..." -ForegroundColor Cyan
$sched = if ($cfg.schedule_hours) { [string]$cfg.schedule_hours } else { "72" }
$privacy = if ($sched -eq "0") { "public" } else { "scheduled" }

Invoke-GitHubApi -Method "POST" -Uri "https://api.github.com/repos/$($cfg.repo)/actions/workflows/repurpose.yml/dispatches" -Token $cfg.token -BodyObj @{
    ref    = "main"
    inputs = @{
        youtube_url    = $YoutubeUrl
        speaker_name   = $cfg.speaker
        aspect         = "landscape"
        duration       = "0"
        upload         = "true"
        privacy        = $privacy
        schedule_hours = $sched
    }
} | Out-Null

Remove-Item $mp3Path -Force -ErrorAction SilentlyContinue

Write-Host "`nSUCCESS! Your cloud runner is creating & scheduling the video now:" -ForegroundColor Green
Write-Host "https://github.com/$($cfg.repo)/actions" -ForegroundColor White
