#!/bin/bash
# Clean old backups
# Remove backup files older than 30 days

BACKUP_DIR="/backup"
find "$BACKUP_DIR" -name "*.sql" -type f -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +30 -delete
find "$BACKUP_DIR" -name "backup_*" -type f -mtime +30 -delete