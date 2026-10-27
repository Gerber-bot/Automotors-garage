@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo =======================================================
echo  AUTOMOTORS GARAGE -- MODO LAN & ACCESO MOVIL
echo =======================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-mobile.ps1" -Port 4000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo =======================================================
    echo  SE PRODUJO UN ERROR AL INICIAR EL MODO MOVIL
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
