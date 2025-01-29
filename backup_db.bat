@echo off
set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 8.0\bin"
set HOST=localhost
set USER=admin
set PASSWORD=hxMGyhGcE8oRRJn
set DATABASE=admin-laido
set BACKUP_PATH=C:\database_backups

:: Tạo thư mục backup nếu chưa tồn tại
if not exist %BACKUP_PATH% mkdir %BACKUP_PATH%

:: Tạo tên file với timestamp (sửa lại phần này)
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (
    set DATESTAMP=%%c-%%a-%%b
)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
    set TIMESTAMP=%%a%%b
)
set BACKUP_FILE=%BACKUP_PATH%\%DATABASE%_%DATESTAMP%_%TIMESTAMP%.sql

:: Thực hiện backup
cd %MYSQL_PATH%
mysqldump.exe --host=%HOST% --user=%USER% --password=%PASSWORD% %DATABASE% > "%BACKUP_FILE%"

:: Nén file backup (sử dụng PowerShell vì CMD không có sẵn lệnh nén)
powershell Compress-Archive -Path "%BACKUP_FILE%" -DestinationPath "%BACKUP_FILE%.zip"
del "%BACKUP_FILE%"

:: Xóa các file backup cũ hơn 7 ngày
forfiles /p %BACKUP_PATH% /s /m *.zip /d -7 /c "cmd /c del @path"

echo Backup completed successfully: %BACKUP_FILE%.zip 