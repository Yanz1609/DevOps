# PowerShell stop script for Drive Mini
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "            DRIVE MINI - DỪNG HỆ THỐNG                  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "Đang dừng và dọn dẹp các containers..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "Đã dừng toàn bộ dịch vụ thành công!" -ForegroundColor Green
pause

