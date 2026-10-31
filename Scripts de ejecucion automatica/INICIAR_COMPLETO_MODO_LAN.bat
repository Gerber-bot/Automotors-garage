@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

rem Determinar la ruta de este script y la raíz del repositorio
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."

echo =======================================================
echo  AUTOMOTORS GARAGE -- MODO RED LOCAL / LAN
echo =======================================================
echo.

rem 1. Validar Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js no está instalado o no se encuentra en el PATH.
    echo Por favor instale Node.js 20 o superior desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)

rem 2. Validar dependencias en la raíz
if not exist "node_modules" (
    echo [INFO] Dependencias no encontradas. Ejecutando npm ci...
    call npm ci
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Falló la instalación de dependencias con npm ci.
        echo.
        pause
        exit /b 1
    )
)

rem 3. Invocar controlador unificado en modo LAN
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%powershell\automotors.ps1" -Action START-LAN
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo =======================================================
    echo  ERROR AL INICIAR EL MODO LAN
    echo =======================================================
    echo  Código de salida: %ERRORLEVEL%
    echo  Revise los diagnósticos anteriores y los logs en .logs\
    echo.
    pause
    exit /b %ERRORLEVEL%
)

exit /b 0
