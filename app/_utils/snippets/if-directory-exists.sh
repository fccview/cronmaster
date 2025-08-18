# @id: if-directory-exists
# @title: Check if directory exists
# @description: Check directory existence and create if needed
# @category: Conditionals
# @tags: if,directory,mkdir,create

# Check if directory exists and create if needed
# Change DIR_PATH to your directory path
DIR_PATH="/path/to/directory"

if [ -d "$DIR_PATH" ]; then
    echo "Directory exists: $DIR_PATH"
else
    echo "Creating directory: $DIR_PATH"
    mkdir -p "$DIR_PATH"
    if [ $? -eq 0 ]; then
        echo "Directory created successfully"
    else
        echo "Failed to create directory"
        exit 1
    fi
fi 