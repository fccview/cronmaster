# @id: copy-files
# @title: Copy files with confirmation
# @description: Copy files with interactive confirmation and error handling
# @category: File Operations
# @tags: copy,cp,file,confirmation

# Copy files with confirmation
# Change SOURCE and DEST to your paths
SOURCE="/path/to/source"
DEST="/path/to/destination"

if [ -f "$SOURCE" ]; then
    cp -i "$SOURCE" "$DEST"
    if [ $? -eq 0 ]; then
        echo "File copied successfully"
    else
        echo "Error copying file"
        exit 1
    fi
else
    echo "Source file does not exist"
    exit 1
fi 