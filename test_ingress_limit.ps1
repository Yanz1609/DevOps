# Script kiểm tra giới hạn upload 100M của Ingress
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  KIỂM TRA TÍNH NĂNG: GIỚI HẠN DUNG LƯỢNG UPLOAD TẠI INGRESS" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$ingressUrl = "http://localhost/api/health"
$tempFile = "$PSScriptRoot\temp_105mb.dat"

try {
    Write-Host "[1/3] Đang tạo file giả lập dung lượng 105 MB..." -ForegroundColor Yellow
    $stream = [System.IO.File]::Create($tempFile)
    $stream.SetLength(105MB)
    $stream.Close()
    Write-Host "  -> File đã tạo: $tempFile (Kích thước: 105 MB)" -ForegroundColor Green

    Write-Host ""
    Write-Host "[2/3] Gửi request upload file 105 MB qua Ingress Gateway (Port 80)..." -ForegroundColor Yellow

    # Sử dụng curl hoặc Invoke-WebRequest để kiểm tra phản hồi từ Nginx Ingress
    $response = curl.exe -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/octet-stream" --data-binary "@$tempFile" "http://localhost/api/upload-test"

    Write-Host ""
    Write-Host "[3/3] KẾT QUẢ PHẢN HỒI TỪ INGRESS:" -ForegroundColor Yellow
    if ($response -eq "413") {
        Write-Host "  HTTP Status Code: 413 (Payload Too Large / Request Entity Too Large)" -ForegroundColor Green
        Write-Host "  >>> KẾT QUẢ: ĐẠT YÊU CẦU! <<<" -ForegroundColor Green
        Write-Host "  Ingress đã chặn thành công file vượt quá giới hạn 100M." -ForegroundColor Green
    } else {
        Write-Host "  HTTP Status Code nhận được: $response" -ForegroundColor Yellow
        Write-Host "  (Nếu Ingress chưa bật, hãy chắc chắn docker-compose đã chạy và port 80 đang lắng nghe)" -ForegroundColor DarkGray
    }
}
finally {
    if (Test-Path $tempFile) {
        Remove-Item -Force $tempFile
        Write-Host ""
        Write-Host "Đã dọn dẹp file tạm 105 MB." -ForegroundColor DarkGray
    }
}

Write-Host ""
pause

