@echo off
chcp 65001 >nul
echo ========================================================
echo        DRIVE MINI - KHỞI ĐỘNG HỆ THỐNG (DOCKER)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Đang build và khởi động các containers...
docker-compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [LỖI] Không thể khởi động Docker Compose.
    echo Vui lòng đảm bảo Docker Desktop đang mở và biểu tượng chuyển màu xanh.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Kiểm tra trạng thái containers...
docker-compose ps

echo.
echo ========================================================
echo [3/3] HỆ THỐNG ĐÃ SẴN SÀNG!
echo ========================================================
echo  * Giao diện Drive (Frontend):  http://localhost:3000
echo  * Ingress Gateway (Port 80):   http://localhost
echo  * MinIO Console (S3 Storage):  http://localhost:9001
echo    (User: minioadmin / Pass: minioadmin123)
echo  * Backend API Health Check:    http://localhost:5000/health
echo ========================================================
echo.
pause

