# @id: backup-files
# @title: Backup files
# @description: Create compressed backup of files
# @category: File Operations
# @tags: backup,files,compress,tar

# Backup files
# Create compressed backup with timestamp

SOURCE="/path/to/source"
BACKUP_DIR="/backup/files"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/backup_${DATE}.tar.gz" -C "$(dirname "$SOURCE")" "$(basename "$SOURCE")" 