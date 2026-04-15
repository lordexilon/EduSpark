@echo off
echo.
echo ========================================
echo   EduSpark - Desarrollo Local
echo ========================================
echo.
echo Iniciando Frontend + Worker...
echo.

REM Abrir frontend en nueva ventana
start "EduSpark Frontend" cmd /k "cd /d %~dp0.. && npm run dev"

REM Esperar 2 segundos
timeout /t 2 /nobreak > nul

REM Abrir worker en nueva ventana
start "EduSpark Worker" cmd /k "cd /d %~dp0..\src\workers\file-processing-worker && npm run dev"

echo.
echo ✅ Servicios iniciados en ventanas separadas:
echo    - Frontend: http://localhost:5173
echo    - Worker: http://localhost:3001
echo.
echo Cierra las ventanas para detener los servicios
echo.
pause
