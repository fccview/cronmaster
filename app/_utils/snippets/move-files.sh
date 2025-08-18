# @id: move-files
# @title: Move files safely
# @description: Move files with backup and error handling
# @category: File Operations
# @tags: move,mv,backup,safe

# Move files with backup
# Change SOURCE and DEST to your paths
SOURCE="/path/to/source"
DEST="/path/to/destination"

# Create backup before moving
if [ -f "$SOURCE" ]; then
    cp "$SOURCE" "${SOURCE}.backup.$(date +%Y%m%d_%H%M%S)"
    mv "$SOURCE" "$DEST"
    echo "File moved successfully with backup created"
else
    echo "Source file does not exist"
    exit 1
fi 