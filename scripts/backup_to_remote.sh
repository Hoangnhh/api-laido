#!/bin/bash

# Configuration
DB_CONTAINER="api-laido_db_1"
DB_NAME="admin-laido"
DB_USER="root"
DB_PASS="YUG5rvClS4+YOFcsS6NXkQ=="
REMOTE_USER="thuypd"
REMOTE_HOST="100.81.34.25"
REMOTE_PATH="backups/admin-laido"
SSH_KEY="/home/administrator/.ssh/id_ed25519"
LOCAL_BACKUP_DIR="/home/administrator/api-laido/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${DB_NAME}_${DATE}.sql"

# Create local backup directory if it doesn't exist
mkdir -p "$LOCAL_BACKUP_DIR"

# Step 1: Dump database from Docker container
echo "Dumping database $DB_NAME..."
docker exec "$DB_CONTAINER" mysqldump --no-tablespaces -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$LOCAL_BACKUP_DIR/$BACKUP_FILE"

if [ $? -ne 0 ]; then
    echo "Error: Database dump failed!"
    exit 1
fi

# Step 2: Compress the backup
echo "Compressing backup..."
gzip "$LOCAL_BACKUP_DIR/$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Step 3: Transfer to remote server
echo "Transferring to remote server $REMOTE_HOST..."
# Ensure remote directory exists
ssh -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH"

if [ $? -ne 0 ]; then
    echo "Error: Failed to connect to remote server or create directory!"
    echo "Please ensure the following public key is added to $REMOTE_USER@$REMOTE_HOST:~/.ssh/authorized_keys:"
    cat "${SSH_KEY}.pub"
    exit 1
fi

rsync -avz -e "ssh -i $SSH_KEY -o BatchMode=yes -o StrictHostKeyChecking=no" "$LOCAL_BACKUP_DIR/$COMPRESSED_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

if [ $? -eq 0 ]; then
    echo "Transfer successful."
    # Optional: Remove local compressed file after transfer
    # rm "$LOCAL_BACKUP_DIR/$COMPRESSED_FILE"
else
    echo "Error: Transfer failed!"
    exit 1
fi

# Step 4: Keep only last 7 days locally
find "$LOCAL_BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete

echo "Backup process completed."
