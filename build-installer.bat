@echo off
cd /d "%~dp0"
echo =======================================================
echo   Building Sound Sentinel Windows Installer (.exe)
echo =======================================================
npm run dist
echo.
echo Build finished! Check the "dist" folder for your installer.
pause
