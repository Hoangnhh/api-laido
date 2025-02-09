@echo off
setlocal enabledelayedexpansion

:: Cấu hình
set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 8.0\bin"
set HOST=localhost
set USER=admin
set PASSWORD="W59UADIxj2KMCB8"
set DATABASE=admin-laido

:: Thư mục tạm để tránh Google Drive quét file
set TEMP_BACKUP_PATH=C:\temp_backups
:: Thư mục chính để lưu file nén
set FINAL_BACKUP_PATH=C:\database_backups

:: Tạo thư mục backup nếu chưa tồn tại
if not exist "%TEMP_BACKUP_PATH%" mkdir "%TEMP_BACKUP_PATH%"
if not exist "%FINAL_BACKUP_PATH%" mkdir "%FINAL_BACKUP_PATH%"

:: Lấy ngày tháng năm
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (
    set DATESTAMP=%%c-%%a-%%b
)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
    set TIMESTAMP=%%a%%b
)
set TIMESTAMP=%TIMESTAMP: =%

:: Đường dẫn file backup
set BACKUP_FILE=%TEMP_BACKUP_PATH%\%DATABASE%_%DATESTAMP%_%TIMESTAMP%.sql
set BACKUP_ZIP=%TEMP_BACKUP_PATH%\%DATABASE%_%DATESTAMP%_%TIMESTAMP%.zip

:: Thực hiện backup
cd /d %MYSQL_PATH%
mysqldump.exe --host=%HOST% --user=%USER% --password=%PASSWORD% --single-transaction --quick %DATABASE% > "%BACKUP_FILE%"

:: Chờ 5 giây để đảm bảo MySQL hoàn tất ghi dữ liệu
timeout /t 5 /nobreak

:: Kiểm tra file backup và nén
if exist "%BACKUP_FILE%" (
    powershell -Command "Compress-Archive -Path '%BACKUP_FILE%' -DestinationPath '%BACKUP_ZIP%'"
    del "%BACKUP_FILE%"
    move "%BACKUP_ZIP%" "%FINAL_BACKUP_PATH%"
)

:: Xóa các file backup cũ hơn 3 ngày
forfiles /p "%FINAL_BACKUP_PATH%" /s /m *.zip /d -3 /c "cmd /c del @path"

exit /b 0