@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo =======================================================
echo  AUTOMOTORS GARAGE -- DIAGNOSTICO DEL SISTEMA
echo =======================================================
echo.

echo [FASE 1/2] Verificando entorno de ejecucion local...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-env.ps1" -Port 4000
set ENV_EXIT_CODE=%ERRORLEVEL%

echo.
echo [FASE 2/2] Verificando conectividad y estado del servidor HTTP...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-health.ps1" -Port 4000
set HEALTH_EXIT_CODE=%ERRORLEVEL%

echo.
echo =======================================================
echo  RESUMEN DEL DIAGNOSTICO
echo =======================================================
if %ENV_EXIT_CODE% EQU 0 (
    echo  [OK]   Entorno local: Node, npm, PowerShell y estructura de monorepo LISTOS.
) else (
    echo  [FAIL] Entorno local: Se detectaron advertencias o requisitos faltantes.
)

if %HEALTH_EXIT_CODE% EQU 0 (
    echo  [OK]   Servidor HTTP: En linea y saludable en http://localhost:4000/.
) else (
    echo  [INFO] Servidor HTTP: El servidor esta actualmente DETENIDO.
    echo         Nota: Esto es normal si aun no ha iniciado el servidor.
    echo         Para iniciarlo, use INICIAR_AUTOMOTORS.bat o INICIAR_DEMO.bat.
)
echo =======================================================
echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
exit /b %ENV_EXIT_CODE%
