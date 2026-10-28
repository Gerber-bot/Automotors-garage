@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo =======================================================
echo  AUTOMOTORS GARAGE -- FRONTEND NEXT.JS (DESARROLLO)
echo =======================================================
echo.

echo [1/2] Verificando dependencias e iniciando Next.js...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\powershell\start-frontend.ps1" -Port 3000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] No se pudo iniciar el servidor Frontend. Codigo: %ERRORLEVEL%
    goto ERROR_HANDLER
)

echo.
echo =======================================================
echo  FRONTEND NEXT.JS INICIADO CON EXITO
echo =======================================================
echo  Dashboard SaaS : http://localhost:3000/
echo  Para detener   : Ejecute DETENER_FRONTEND.bat
echo =======================================================
echo.
exit /b 0

:ERROR_HANDLER
echo.
echo Presione cualquier tecla para salir...
pause >nul
exit /b %ERRORLEVEL%
