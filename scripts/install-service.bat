@echo off
setlocal

:: Paymore Kiosk Log Agent Installation Script
:: Uses NSSM to install the executable as a Windows Service with graceful shutdown

SET SERVICE_NAME=PaymoreLogAgent
SET EXE_PATH="%~dp0paymore-kiosk-log-agent.exe"
SET NSSM_PATH="%~dp0nssm.exe"

IF NOT EXIST %NSSM_PATH% (
    echo NSSM not found at %NSSM_PATH%. Please download nssm.exe and place it in the scripts folder.
    exit /b 1
)

IF NOT EXIST %EXE_PATH% (
    echo Executable not found at %EXE_PATH%. Please run 'npm run build' first.
    exit /b 1
)

echo Installing %SERVICE_NAME%...
%NSSM_PATH% install %SERVICE_NAME% %EXE_PATH%

echo Configuring service to start automatically...
%NSSM_PATH% set %SERVICE_NAME% Start SERVICE_AUTO_START

echo Configuring graceful shutdown (CTRL+C)...
:: 15000ms = 15 seconds for graceful shutdown before forcefully killing
%NSSM_PATH% set %SERVICE_NAME% AppStopMethodSkip 6
%NSSM_PATH% set %SERVICE_NAME% AppStopMethodConsole 15000

echo Configuring automatic restart on crash...
%NSSM_PATH% set %SERVICE_NAME% AppExit Default Restart
%NSSM_PATH% set %SERVICE_NAME% AppRestartDelay 60000

echo.
echo === Configure Cloud Connection ===
echo To securely connect this kiosk to your cloud servers, please provide the keys below.
echo (Press Enter without typing to use the built-in defaults)
echo.
set /p AUTH_ENDPOINT="1. Paste the Auth Endpoint URL (or press Enter to skip): "
set /p STATIC_TOKEN="2. Paste the Secret Token (or press Enter to skip): "

echo.
echo Saving keys to System Environment Variables (if provided)...
IF NOT "%AUTH_ENDPOINT%"=="" (
    setx PAYMORE_AGENT_UPLOAD_AUTH_ENDPOINT "%AUTH_ENDPOINT%" /M >nul
)
IF NOT "%STATIC_TOKEN%"=="" (
    setx PAYMORE_AGENT_UPLOAD_STATIC_TOKEN "%STATIC_TOKEN%" /M >nul
)
echo.
echo Starting the background service...
%NSSM_PATH% start %SERVICE_NAME%

echo.
echo ==============================================
echo SUCCESS! The agent is now running invisibly.
echo ==============================================
echo.
endlocal
pause
