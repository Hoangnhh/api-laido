@echo off
set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 8.0\bin"
set HOST=localhost
set USER=admin
set PASSWORD=hxMGyhGcE8oRRJn
set DATABASE=admin-laido
set BACKUP_PATH=C:\database_backups

:: Tạo thư mục backup nếu chưa tồn tại
if not exist %BACKUP_PATH% mkdir %BACKUP_PATH%

:: Tạo tên file với timestamp
set TIMESTAMP=%date:~-4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%
set BACKUP_FILE=%BACKUP_PATH%\%DATABASE%_%TIMESTAMP%.sql

:: Thực hiện backup
cd %MYSQL_PATH%
mysqldump.exe --host=%HOST% --user=%USER% --password=%PASSWORD% %DATABASE% > "%BACKUP_FILE%"

:: Nén file backup (sử dụng PowerShell vì CMD không có sẵn lệnh nén)
powershell Compress-Archive -Path "%BACKUP_FILE%" -DestinationPath "%BACKUP_FILE%.zip"
del "%BACKUP_FILE%"

:: Xóa các file backup cũ hơn 7 ngày
forfiles /p %BACKUP_PATH% /s /m *.zip /d -7 /c "cmd /c del @path"

echo Backup completed successfully: %BACKUP_FILE%.zip 