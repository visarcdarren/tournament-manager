@echo off
echo Rebuilding with SSE fixes...

REM Full rebuild
docker-compose -f docker-compose.simple.yml down
docker-compose -f docker-compose.simple.yml build --no-cache
docker-compose -f docker-compose.simple.yml up -d

echo.
echo Rebuild complete! 
echo Wait about 10 seconds for the server to start...
echo Then access http://localhost:3001
echo.
echo To check logs if there are issues:
echo docker-compose -f docker-compose.simple.yml logs -f
pause
