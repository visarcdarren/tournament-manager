@echo off
echo Checking Node.js version...
node --version

echo.
echo If your Node version is less than 16, you need to update Node.js
echo Download from: https://nodejs.org/
echo.

echo Starting development servers...
echo.

REM Start backend server
echo Starting backend server...
start cmd /k "cd server && npm install && npm start"

REM Wait a bit for server to start
timeout /t 3 /nobreak > nul

REM Start frontend dev server
echo Starting frontend dev server...
cd client
npm install
npm run dev

pause
