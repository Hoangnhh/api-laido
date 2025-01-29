# Cấu hình thông tin database
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin" # Điều chỉnh đường dẫn MySQL của bạn
$host = "localhost"
$user = "admin"
$password = "hxMGyhGcE8oRRJn"
$database = "admin-laido"

# Tạo thư mục backup nếu chưa tồn tại
$backupPath = "C:\database_backups"
if (!(Test-Path -Path $backupPath)) {
    New-Item -ItemType Directory -Path $backupPath
}

# Tạo tên file backup với timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupFile = "$backupPath\${database}_${timestamp}.sql"

# Thực hiện backup
try {
    Set-Location $mysqlPath
    $command = ".\mysqldump.exe --host=$host --user=$user --password=$password $database > `"$backupFile`""
    cmd.exe /c $command

    # Nén file backup
    Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip"
    Remove-Item $backupFile

    # Xóa các file backup cũ hơn 7 ngày
    $limit = (Get-Date).AddDays(-7)
    Get-ChildItem -Path $backupPath -Filter "*.zip" | Where-Object { $_.CreationTime -lt $limit } | Remove-Item

    Write-Host "Backup completed successfully: $backupFile.zip"
} catch {
    Write-Host "Backup failed: $_"
}