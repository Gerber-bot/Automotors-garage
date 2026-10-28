@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo =======================================================
echo  AUTOMOTORS GARAGE -- DETENER STACK COMPLETO
echo =======================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\powershell\stop-stack.ps1" -BackendPort 4000 -FrontendPort 3000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo =======================================================
    echo  ERROR AL DETENER EL STACK
    echo =======================================================
    echo  Codigo de salida: %ERRORLEVEL%
    echo.
    echo Presione cualquier tecla para salir...
    pause >nul
    exit /b %ERRORLEVEL%
)

echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
exit /b 0
