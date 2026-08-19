@echo off
REM ---------------------------------------------------------------------
REM Starts the AgroMet Android emulator.
REM
REM Double-click this file, or run it from any terminal. Keep the window
REM it opens OPEN — closing it shuts the emulator down.
REM
REM Why this exists: the emulator must be owned by your own session to
REM survive. Launched from a tool/automation session it gets cleaned up
REM when that session ends.
REM ---------------------------------------------------------------------

set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%"

echo Starting AgroMet_Pixel_API35...
echo (First boot takes ~2-3 minutes. Leave this window open.)
echo.

"%ANDROID_HOME%\emulator\emulator.exe" -avd AgroMet_Pixel_API35 -no-boot-anim

echo.
echo Emulator has exited.
pause
