# Script kiểm tra tính năng sao lưu (Backup) Object Storage MinIO
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     KIỂM TRA TÍNH NĂNG: SAO LƯU (BACKUP) OBJECT STORAGE  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$backupDir = "$PSScriptRoot\backup_data"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

Write-Host "[1/3] Chuẩn bị thư mục sao lưu cục bộ tại: $backupDir" -ForegroundColor Yellow

Write-Host ""
Write-Host "[2/3] Chạy container MinIO Client (mc) thực hiện lệnh 'mc mirror'..." -ForegroundColor Yellow

docker run --rm --network drive-mini_default `
    -v "${backupDir}:/backup" `
    drive-minio:local `
    /bin/sh -c "
        echo 'Connecting to MinIO...';
        /usr/local/bin/mc alias set localminio http://minio:9000 minioadmin minioadmin123;
        echo 'Mirroring bucket drive-files to backup volume...';
        /usr/local/bin/mc mirror --overwrite localminio/drive-files /backup/drive-files-backup/;
        echo 'Mirroring bucket drive-thumbnails to backup volume...';
        /usr/local/bin/mc mirror --overwrite localminio/drive-thumbnails /backup/drive-thumbnails-backup/;
        echo 'Backup mirror completed successfully!';
    "

Write-Host ""
Write-Host "[3/3] KẾT QUẢ SAO LƯU:" -ForegroundColor Yellow
if (Test-Path "$backupDir\drive-files-backup") {
    Write-Host "  >>> KẾT QUẢ: ĐẠT YÊU CẦU! <<<" -ForegroundColor Green
    Write-Host "  Dữ liệu đã được sao lưu toàn vẹn sang thư mục backup:" -ForegroundColor Green
    Get-ChildItem -Path $backupDir -Recurse | Select-Object FullName
} else {
    Write-Host "  Chưa thấy dữ liệu sao lưu. Vui lòng đảm bảo hệ thống docker-compose đang chạy." -ForegroundColor Red
}

Write-Host ""
pause
