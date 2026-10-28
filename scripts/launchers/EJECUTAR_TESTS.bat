@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo =======================================================
echo  AUTOMOTORS GARAGE -- EJECUTOR DE PRUEBAS
echo =======================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\utilities\run-tests.ps1" -Suite all
set TEST_EXIT_CODE=%ERRORLEVEL%

echo.
echo =======================================================
if %TEST_EXIT_CODE% EQU 0 (
    echo  RESULTADO FINAL: TODAS LAS PRUEBAS APROBADAS [EXIT 0]
) else (
    echo  RESULTADO FINAL: SE DETECTARON FALLOS [EXIT %TEST_EXIT_CODE%]
)
echo =======================================================
echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
exit /b %TEST_EXIT_CODE%
