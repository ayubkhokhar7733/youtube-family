@echo off
title Fleet Studio - Local Audio Bridge
cd /d "%~dp0\.."
echo ========================================================
echo  Fleet Studio - Local Audio Bridge (Port 7733)
echo  Allows 1-Click Auto-Grab MP3 directly in Vercel Studio
echo ========================================================
python tools\audio_bridge.py
pause
