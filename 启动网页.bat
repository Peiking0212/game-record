@echo off
cd /d "%~dp0.."
start "GameRecord Server" /min py serve.py
timeout /t 2 /nobreak >nul
start http://localhost:8080/
