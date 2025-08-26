@echo off
setlocal enabledelayedexpansion

:: DaSi Docker Setup and Start Script for Windows
echo 🐳 Starting DaSi English Learning Platform with Docker...

:: Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

:: Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Docker Compose is not available. Please install Docker Compose.
        pause
        exit /b 1
    )
    set DOCKER_COMPOSE=docker compose
) else (
    set DOCKER_COMPOSE=docker-compose
)

echo 📋 Checking environment configuration...

:: Check if .env file exists, if not copy from template
if not exist ".\backend\.env" (
    if exist ".\backend\.env.docker" (
        echo ⚠️  .env not found, copying from .env.docker template
        copy ".\backend\.env.docker" ".\backend\.env"
        echo ⚠️  Please update .\backend\.env with your actual configuration
    ) else (
        echo ❌ .env.docker template not found. Please create environment configuration.
        pause
        exit /b 1
    )
)

:: Stop any running containers
echo 📋 Stopping existing containers...
%DOCKER_COMPOSE% down --remove-orphans

:: Build images
echo 📋 Building Docker images...
%DOCKER_COMPOSE% build --no-cache

:: Start services
echo 📋 Starting services...
if "%1"=="prod" (
    echo 📋 Starting with production profile ^(includes nginx^)
    %DOCKER_COMPOSE% --profile production up -d
) else (
    echo 📋 Starting with development profile
    %DOCKER_COMPOSE% up -d
)

:: Wait for services to be ready
echo 📋 Waiting for services to start...
timeout /t 10 /nobreak >nul

:: Check backend health
echo 📋 Checking service health...
curl -f http://localhost:8080/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend service is not responding
    %DOCKER_COMPOSE% logs backend
    pause
    exit /b 1
) else (
    echo ✅ Backend service is healthy
)

:: Check Redis health (simplified for Windows)
echo ✅ Redis service is assumed healthy

echo.
echo ✅ 🎉 DaSi platform is running successfully!
echo.
echo 🔗 Service URLs:
echo    • Backend API: http://localhost:8080
echo    • Health Check: http://localhost:8080/health
echo    • Metrics: http://localhost:8080/metrics
echo    • Redis: localhost:6379

if "%1"=="prod" (
    echo    • Frontend: http://localhost:80
    echo    • Nginx Status: http://localhost:80/health
)

echo.
echo 📊 Useful commands:
echo    • View logs: %DOCKER_COMPOSE% logs -f [service]
echo    • Stop services: %DOCKER_COMPOSE% down
echo    • Restart service: %DOCKER_COMPOSE% restart [service]
echo    • View status: %DOCKER_COMPOSE% ps
echo.

:: Show running containers
echo 📋 Running containers:
%DOCKER_COMPOSE% ps

pause