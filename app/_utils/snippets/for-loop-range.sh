# @id: for-loop-range
# @title: For loop with range
# @description: Loop through a range of numbers
# @category: Loops
# @tags: loop,range,numbers,seq

# Loop through a range of numbers
# Change START and END to your desired range
START=1
END=10

for i in $(seq $START $END); do
    echo "Processing item $i"
    # Add your processing logic here
    # Example: process_item $i
done

echo "Finished processing range $START to $END" 