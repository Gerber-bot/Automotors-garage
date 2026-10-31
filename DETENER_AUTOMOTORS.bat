@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

rem Determinar la raíz absoluta del repositorio
set "REPO_ROOT=%~dp0"
cd /d "%REPO_ROOT%"

echo =======================================================
echo  AUTOMOTORS GARAGE -- DETENCION DE SERVICIOS
echo =======================================================
echo.

rem Detener de forma limpia frontend (puerto 3000) y backend (puerto 4000)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%scripts\powershell\stop-stack.ps1" -BackendPort 4000 -FrontendPort 3000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ADVERTENCIA] La detención reportó advertencias o procesos rebeldes.
    echo Si persisten puertos tomados, ejecute en PowerShell:
    echo powershell -File "%REPO_ROOT%scripts\powershell\stop-stack.ps1" -Force
    echo.
)

echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
exit /b 0
