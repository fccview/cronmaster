# @id: if-file-exists
# @title: Check if file exists
# @description: Check file existence and handle accordingly
# @category: Conditionals
# @tags: if,file,exists,check

# Check if file exists
# Change FILE_PATH to your file path
FILE_PATH="/path/to/file"

if [ -f "$FILE_PATH" ]; then
    echo "File exists: $FILE_PATH"
    # Add your logic for existing file
else
    echo "File does not exist: $FILE_PATH"
    # Add your logic for missing file
fi 