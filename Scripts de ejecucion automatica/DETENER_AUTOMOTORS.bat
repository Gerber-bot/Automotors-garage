@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

rem Determinar la ruta de este script y la raíz del repositorio
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."

echo =======================================================
echo  AUTOMOTORS GARAGE -- DETENCION DE SERVICIOS
echo =======================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%automotors.ps1" -Action STOP
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ADVERTENCIA] La detención reportó advertencias.
    echo.
)

echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
exit /b 0
