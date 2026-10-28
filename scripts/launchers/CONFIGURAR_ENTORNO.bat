@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo =======================================================
echo  AUTOMOTORS GARAGE -- CONFIGURACION DE ENTORNO LOCAL
echo =======================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\utilities\setup-dev.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo =======================================================
    echo  SE PRODUJO UN ERROR EN LA CONFIGURACION
    echo =======================================================
    echo  Codigo de salida: %ERRORLEVEL%
    echo.
    echo Presione cualquier tecla para salir...
    pause >nul
    exit /b %ERRORLEVEL%
)

echo.
echo =======================================================
echo  ENTORNO LOCAL CONFIGURADO CON EXITO
echo =======================================================
echo  Directorios runtime inicializados (.data, .run, .logs).
echo  Archivo .env comprobado (no se sobrescribio).
echo  Ya puede iniciar Automotors Garage con INICIAR_AUTOMOTORS.bat.
echo =======================================================
echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
exit /b 0
