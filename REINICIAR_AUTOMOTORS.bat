@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo =======================================================
echo  AUTOMOTORS GARAGE -- REINICIAR SERVICIOS
echo =======================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restart-dev.ps1" -Port 4000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo =======================================================
    echo  SE PRODUJO UN ERROR AL REINICIAR EL SERVICIO
    echo =======================================================
    echo  Codigo de salida: %ERRORLEVEL%
    echo.
    echo Presione cualquier tecla para salir...
    pause >nul
    exit /b %ERRORLEVEL%
)

echo.
echo Confirmando disponibilidad para abrir el navegador...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-health.ps1" -Port 4000 -Silent
if %ERRORLEVEL% EQU 0 (
    echo Abriendo http://localhost:4000/ en el navegador...
    start http://localhost:4000/
) else (
    echo [ADVERTENCIA] No se pudo verificar la salud del servidor. No se abrira el navegador.
)

echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
exit /b 0
