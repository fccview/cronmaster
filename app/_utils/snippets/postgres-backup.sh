# @id: postgres-backup
# @title: PostgreSQL database backup
# @description: Create a PostgreSQL database backup with timestamp
# @category: Database Operations
# @tags: postgres,postgresql,database,backup,pg_dump

# PostgreSQL database backup
# Change these variables to your database details
DB_NAME="your_database"
DB_USER="your_username"
BACKUP_DIR="/path/to/backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"

# Create the backup
pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Database backup created: $BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "Backup compressed: ${BACKUP_FILE}.gz"
else
    echo "Database backup failed"
    exit 1
fi 