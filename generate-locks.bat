@echo off
echo Generating package-lock.json files...

echo Installing client dependencies...
cd client
call npm install
cd ..

echo.
echo Installing server dependencies...
cd server
call npm install
cd ..

echo.
echo Lock files generated successfully!
echo You can now build the Docker image with: docker-compose build
pause
