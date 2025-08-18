# @id: for-loop-files
# @title: For loop through files
# @description: Process multiple files in a directory
# @category: Loops
# @tags: loop,files,for,process

# Loop through files in a directory
# Change DIRECTORY to your target directory
DIRECTORY="/path/to/files"

for file in "$DIRECTORY"/*; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        # Add your processing logic here
        # Example: process_file "$file"
    fi
done

echo "All files processed" 