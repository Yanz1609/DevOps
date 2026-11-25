# PowerShell start script for Drive Mini
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       DRIVE MINI - KHỞI ĐỘNG HỆ THỐNG (DOCKER)         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/3] Đang build và khởi động các containers..." -ForegroundColor Yellow
docker-compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[LỖI] Không thể khởi động Docker Compose." -ForegroundColor Red
    Write-Host "Vui lòng đảm bảo Docker Desktop đang mở và đang chạy (biểu tượng màu xanh)." -ForegroundColor Red
    pause
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[2/3] Kiểm tra trạng thái containers..." -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "[3/3] HỆ THỐNG ĐÃ SẴN SÀNG!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host " * Giao diện Drive (Frontend):  http://localhost:3000" -ForegroundColor White
Write-Host " * Ingress Gateway (Port 80):   http://localhost" -ForegroundColor White
Write-Host " * MinIO Console (S3 Storage):  http://localhost:9001" -ForegroundColor White
Write-Host "   (User: minioadmin / Pass: minioadmin123)" -ForegroundColor DarkGray
Write-Host " * Backend API Health Check:    http://localhost:5000/health" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
pause

