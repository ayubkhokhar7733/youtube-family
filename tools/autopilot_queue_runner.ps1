# ==============================================================================
# Fleet Studio — Autopilot Channel Queue Worker
# Automatically pulls videos from the channel queue when runner is free,
# caches audio locally (100% cloud bot-block proof), and triggers cloud production.
# ==============================================================================

param (
    [string]$ChannelId = "habitos_de_acero",
    [switch]$Loop = $false,
    [int]$PollIntervalSec = 300
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BaseDir = Split-Path -Parent $ScriptDir

$ChannelsFile = Join-Path $BaseDir "channels.json"
if (-not (Test-Path $ChannelsFile)) {
    Write-Error "channels.json not found in $BaseDir"
}

$ChannelsData = Get-Content $ChannelsFile -Raw -Encoding UTF8 | ConvertFrom-Json
$Channel = $ChannelsData.channels | Where-Object { $_.id -eq $ChannelId -or $_.id -eq ($ChannelId -replace '-', '_') }

if (-not $Channel) {
    Write-Error "Channel '$ChannelId' not found in channels.json"
}

Write-Host "========================================================" -ForegroundColor DarkCyan
Write-Host "🤖 FLEET STUDIO AUTOPILOT WORKER" -ForegroundColor Cyan
Write-Host "   Channel: $($Channel.name) ($($Channel.owner))" -ForegroundColor White
Write-Host "   Repo:    $($Channel.repo)" -ForegroundColor White
Write-Host "   Rhythm:  Every $($Channel.schedule_hours)h" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor DarkCyan

function Get-ChannelQueue {
    param([string]$CId)
    $norm = $CId -replace '-', '_'
    $paths = @(
        (Join-Path $BaseDir "channels\$norm\queue.json"),
        (Join-Path $BaseDir "channels\$($norm -replace '_', '-')\queue.json")
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            $raw = Get-Content $p -Raw -Encoding UTF8
            return @{ Path = $p; Items = (ConvertFrom-Json $raw) }
        }
    }
    return $null
}

function Save-ChannelQueue {
    param([string]$Path, $Items)
    $json = $Items | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($Path, $json, [System.Text.Encoding]::UTF8)
}

function Check-RunnerIdle {
    param([string]$Repo)
    try {
        $activeRuns = gh run list -R $Repo --status in_progress --json databaseId | ConvertFrom-Json
        return ($activeRuns.Count -eq 0)
    } catch {
        Write-Warning "Could not query GitHub runner status: $_"
        return $false
    }
}

function Process-NextQueueItem {
    $qData = Get-ChannelQueue -CId $Channel.id
    if (-not $qData -or -not $qData.Items) {
        Write-Host "⚠️  No queue found for $($Channel.name)" -ForegroundColor Yellow
        return $false
    }

    $queue = @($qData.Items)
    $next = $queue | Where-Object { $_.status -eq "queued" } | Select-Object -First 1

    if (-not $next) {
        Write-Host "✅ All queued videos have been processed for $($Channel.name)!" -ForegroundColor Green
        return $false
    }

    Write-Host "`n🎯 Next Queued Video: $($next.title)" -ForegroundColor Yellow
    Write-Host "   ID:       $($next.id)" -ForegroundColor White
    Write-Host "   Duration: $($next.duration_formatted)" -ForegroundColor White
    Write-Host "   URL:      $($next.url)" -ForegroundColor White

    # 1. Check if GitHub Actions runner is idle
    Write-Host "`n[1/4] Checking if cloud runner is free on $($Channel.repo)..." -ForegroundColor Cyan
    $isIdle = Check-RunnerIdle -Repo $Channel.repo
    if (-not $isIdle) {
        Write-Host "⏳ Cloud runner is currently BUSY processing another job. Will wait..." -ForegroundColor Yellow
        return $false
    }
    Write-Host "✅ Runner is IDLE and ready!" -ForegroundColor Green

    # 2. Check local repo clone in scratch
    $scratchDir = "C:\Users\Microsoft\.gemini\antigravity\brain\4c303567-e50b-4a0f-a581-da5e05e72ad7\scratch\$($Channel.repo.Split('/')[1])"
    $audioCommitted = $false

    if (Test-Path $scratchDir) {
        Write-Host "`n[2/4] Downloading audio locally with yt-dlp (bypasses all bot-blocks)..." -ForegroundColor Cyan
        $incDir = Join-Path $scratchDir "data\incoming_audio"
        if (-not (Test-Path $incDir)) { New-Item -ItemType Directory -Path $incDir -Force | Out-Null }
        
        $targetMp3 = Join-Path $incDir "$($next.id)_audio.mp3"
        if (-not (Test-Path $targetMp3) -or (Get-Item $targetMp3).Length -lt 1000) {
            yt-dlp -x --audio-format mp3 -o $targetMp3 $next.url
        }

        if (Test-Path $targetMp3) {
            $mb = [math]::Round((Get-Item $targetMp3).Length / 1MB, 2)
            Write-Host "✅ Downloaded MP3 locally: $targetMp3 ($mb MB)" -ForegroundColor Green

            # Commit to repo
            Push-Location $scratchDir
            git add "data/incoming_audio/$($next.id)_audio.mp3"
            git commit -m "Autopilot cache audio for $($next.id)" -q
            git push origin main -q
            Pop-Location
            $audioCommitted = $true
            Write-Host "✅ Committed audio to $($Channel.repo) main branch" -ForegroundColor Green
        }
    }

    # 3. Dispatch Cloud Pipeline
    Write-Host "`n[3/4] Dispatching GitHub Actions Workflow (repurpose.yml)..." -ForegroundColor Cyan
    $dispatchArgs = @(
        "workflow", "run", $Channel.workflow,
        "-R", $Channel.repo,
        "-f", "youtube_url=$($next.url)",
        "-f", "speaker_name=$($Channel.speaker)",
        "-f", "aspect=landscape",
        "-f", "duration=0",
        "-f", "upload=true",
        "-f", "privacy=scheduled",
        "-f", "schedule_hours=$($Channel.schedule_hours)"
    )
    gh @dispatchArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "🚀 Workflow dispatched successfully!" -ForegroundColor Green

        # 4. Update queue status
        $next.status = "processing"
        $next.dispatched_at = (Get-Date).ToString("o")
        Save-ChannelQueue -Path $qData.Path -Items $queue
        Write-Host "📝 Updated queue status to 'processing' in $($qData.Path)" -ForegroundColor Gray
        return $true
    } else {
        Write-Host "❌ Failed to dispatch workflow" -ForegroundColor Red
        return $false
    }
}

# Execution
if ($Loop) {
    Write-Host "🔄 Autopilot continuous loop started (checking every $PollIntervalSec seconds)..." -ForegroundColor Cyan
    while ($true) {
        Process-NextQueueItem
        Write-Host "`nSleeping for $PollIntervalSec seconds... (Press Ctrl+C to stop)" -ForegroundColor DarkGray
        Start-Sleep -Seconds $PollIntervalSec
    }
} else {
    Process-NextQueueItem
}
