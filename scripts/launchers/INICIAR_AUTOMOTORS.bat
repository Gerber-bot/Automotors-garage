@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo =======================================================
echo  AUTOMOTORS GARAGE -- INICIAR SERVICIOS (DESARROLLO)
echo =======================================================
echo.

echo [1/3] Verificando entorno de ejecucion...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\utilities\check-env.ps1" -Port 4000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] La verificacion de entorno fallo. Codigo de salida: %ERRORLEVEL%
    goto ERROR_HANDLER
)

echo.
echo [2/3] Iniciando servidor backend de desarrollo...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\powershell\start-dev.ps1" -Port 4000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] No se pudo iniciar el servidor. Codigo de salida: %ERRORLEVEL%
    goto ERROR_HANDLER
)

echo.
echo [3/3] Confirmando disponibilidad del servicio...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\utilities\check-health.ps1" -Port 4000 -Silent
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ADVERTENCIA] El servidor fue iniciado pero el healthcheck no respondio a tiempo.
    echo               No se abrira el navegador automaticamente.
    goto ERROR_HANDLER
)

echo.
echo =======================================================
echo  AUTOMOTORS GARAGE INICIADO CON EXITO
echo =======================================================
echo  URL Principal : http://localhost:4000/
echo  Demo UI       : http://localhost:4000/demo
echo  Health Live   : http://localhost:4000/health/live
echo  Para detener  : Ejecute DETENER_AUTOMOTORS.bat
echo =======================================================
echo.
echo Abriendo aplicacion en el navegador predeterminado...
start http://localhost:4000/

echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
exit /b 0

:ERROR_HANDLER
echo.
echo =======================================================
echo  SE PRODUJO UN ERROR AL INICIAR AUTOMOTORS GARAGE
echo =======================================================
echo  Revise los mensajes anteriores y los logs en .logs/
echo.
echo Presione cualquier tecla para salir...
pause >nul
exit /b %ERRORLEVEL%
