@echo off
setlocal enabledelayedexpansion

:: Tournament Manager Docker Helper for Windows

:: Check if Docker is running
docker version >nul 2>&1
if errorlevel 1 (
    echo Docker is not running or not installed.
    echo Please start Docker Desktop or install Docker.
    pause
    exit /b 1
)

:: Display menu
:menu
cls
echo ========================================
echo Tournament Manager Docker Helper
echo ========================================
echo.
echo 1. Start Tournament Manager
echo 2. Stop Tournament Manager
echo 3. Restart Tournament Manager
echo 4. Build Docker Image
echo 5. View Logs
echo 6. Create Backup
echo 7. Restore Backup
echo 8. Show Status
echo 9. Clean Up (Remove all)
echo 0. Exit
echo.
set /p choice="Select an option: "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto build
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto backup
if "%choice%"=="7" goto restore
if "%choice%"=="8" goto status
if "%choice%"=="9" goto clean
if "%choice%"=="0" exit /b 0
goto menu

:start
echo Starting Tournament Manager...
docker-compose up -d
echo.
echo Tournament Manager started! Access at http://localhost:3001
pause
goto menu

:stop
echo Stopping Tournament Manager...
docker-compose down
echo.
echo Tournament Manager stopped.
pause
goto menu

:restart
echo Restarting Tournament Manager...
docker-compose restart
echo.
echo Tournament Manager restarted.
pause
goto menu

:build
echo Building Tournament Manager image...
docker-compose build --no-cache
echo.
echo Build complete!
pause
goto menu

:logs
echo Showing logs (Press Ctrl+C to exit)...
docker-compose logs -f tournament-manager
pause
goto menu

:backup
echo Creating backup...
if not exist backups mkdir backups

:: Get current date and time
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "timestamp=%dt:~0,4%%dt:~4,2%%dt:~6,2%-%dt:~8,2%%dt:~10,2%%dt:~12,2%"
set "backup_file=tournament-data-%timestamp%.tar.gz"

docker run --rm -v tournament-manager-2-opus_tournament-data:/data -v %cd%\backups:/backups alpine tar -czf /backups/%backup_file% -C /data .

echo.
echo Backup created: backups\%backup_file%
pause
goto menu

:restore
echo Available backups:
dir /b backups\*.tar.gz 2>nul || echo No backups found
echo.
set /p backup_file="Enter backup filename to restore (or 'cancel' to abort): "

if "%backup_file%"=="cancel" goto menu

if not exist "backups\%backup_file%" (
    echo Backup file not found: backups\%backup_file%
    pause
    goto menu
)

echo.
echo WARNING: This will replace all current tournament data!
set /p confirm="Are you sure you want to continue? (yes/no): "

if not "%confirm%"=="yes" goto menu

echo Restoring from backup...
docker-compose down
docker run --rm -v tournament-manager-2-opus_tournament-data:/data -v %cd%\backups:/backups alpine sh -c "rm -rf /data/* && tar -xzf /backups/%backup_file% -C /data"
docker-compose up -d

echo.
echo Restore complete!
pause
goto menu

:status
echo Tournament Manager Status:
docker-compose ps
echo.
echo Data Volume Info:
docker volume inspect tournament-manager-2-opus_tournament-data
pause
goto menu

:clean
echo WARNING: This will remove all containers, images, and volumes!
set /p confirm="Are you sure? (yes/no): "

if not "%confirm%"=="yes" goto menu

docker-compose down -v --rmi all
echo.
echo Clean up complete!
pause
goto menu
