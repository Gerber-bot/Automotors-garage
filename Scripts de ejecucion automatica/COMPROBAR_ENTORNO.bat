@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

rem Determinar la ruta de este script y la raíz del repositorio
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."

echo =======================================================
echo  AUTOMOTORS GARAGE -- COMPROBADOR DE ENTORNO
echo =======================================================
echo.
echo Iniciando verificador de requisitos y entorno local...
echo Herramienta no destructiva: no modifica archivos ni base de datos.
echo.

rem 1. Validar que PowerShell esté disponible
where powershell.exe >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Windows PowerShell no está disponible en este sistema.
    echo Se requiere Windows PowerShell 5.1 o PowerShell 7+.
    echo.
    pause
    exit /b 1
)

rem 2. Invocar el verificador de entorno a través del controlador
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%powershell\automotors.ps1" -Action CHECK
set "CHECK_EXIT=%ERRORLEVEL%"

echo.
if %CHECK_EXIT% EQU 0 (
    echo -------------------------------------------------------
    echo  COMPROBACION FINALIZADA: EQUIPO PREPARADO
    echo -------------------------------------------------------
) else (
    echo -------------------------------------------------------
    echo  COMPROBACION FINALIZADA: SE REQUIERE ATENCION
    echo  Revise las recomendaciones indicadas arriba.
    echo -------------------------------------------------------
)
echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul

exit /b %CHECK_EXIT%
