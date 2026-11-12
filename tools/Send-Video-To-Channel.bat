@echo off
title YouTube Family - Send Video to Cloud Pipeline
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0send_video.ps1"
echo.
pause
