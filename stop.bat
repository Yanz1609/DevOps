@echo off
chcp 65001 >nul
echo ========================================================
echo        DRIVE MINI - DỪNG HỆ THỐNG
echo ========================================================
echo.

cd /d "%~dp0"

echo Đang dừng và gỡ các container...
docker-compose down

echo.
echo Đã dừng toàn bộ dịch vụ thành công!
pause

