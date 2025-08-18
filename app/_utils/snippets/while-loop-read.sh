# @id: while-loop-read
# @title: While loop reading input
# @description: Read input line by line and process it
# @category: Loops
# @tags: loop,while,read,input

# Read input line by line
# You can pipe input: echo "line1\nline2" | ./script.sh
while IFS= read -r line; do
    echo "Processing line: $line"
    # Add your processing logic here
    # Example: process_line "$line"
done

echo "Finished processing all input" 