@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

rem Determinar la raíz absoluta del repositorio
set "REPO_ROOT=%~dp0"
cd /d "%REPO_ROOT%"

echo =======================================================
echo  AUTOMOTORS GARAGE -- MODO LAN Y ACCESO MOVIL
echo =======================================================
echo.

rem 1. Validar presencia de Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js no está instalado o no se encuentra en el PATH.
    echo Por favor instale Node.js 20 o superior desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)

rem 2. Validar presencia de npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm no está disponible en el PATH.
    echo.
    pause
    exit /b 1
)

rem 3. Validar dependencias instaladas en la raíz
if not exist "%REPO_ROOT%node_modules" (
    echo [INFO] Dependencias de monorepo no encontradas.
    echo Ejecutando npm ci para instalación limpia y reproducible...
    call npm ci
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Falló la instalación de dependencias con npm ci.
        echo Verifique su conexión o ejecute npm install manualmente.
        echo.
        pause
        exit /b 1
    )
)

rem 4. Validar dependencias de frontend
if not exist "%REPO_ROOT%apps\frontend\node_modules" (
    echo [INFO] Instalando dependencias de apps/frontend...
    call npm --prefix "%REPO_ROOT%apps\frontend" install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Falló la instalación de dependencias en apps/frontend.
        echo.
        pause
        exit /b 1
    )
)

rem 5. Iniciar Backend y Frontend en modo LAN (0.0.0.0 con detección automática de IP)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%scripts\powershell\start-stack.ps1" -BackendPort 4000 -FrontendPort 3000 -LAN
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
