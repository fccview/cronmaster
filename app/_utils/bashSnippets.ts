/* eslint-disable @typescript-eslint/no-unused-vars */
export interface BashSnippet {
  id: string;
  title: string;
  description: string;
  category: string;
  template: string;
  tags: string[];
}

export const bashSnippets: BashSnippet[] = [
  // File Operations
  {
    id: "backup-rsync",
    title: "Backup with rsync",
    description:
      "Create a backup using rsync with progress and exclude options",
    category: "File Operations",
    template: `# Backup source directory to destination
# Change SOURCE_DIR and DEST_DIR to your paths
SOURCE_DIR="/path/to/source"
DEST_DIR="/path/to/backup"

rsync -av --progress --delete \\
  --exclude='*.tmp' \\
  --exclude='*.log' \\
  --exclude='node_modules' \\
  "$SOURCE_DIR/" "$DEST_DIR/"

echo "Backup completed at $(date)"`,
    tags: ["backup", "rsync", "sync", "copy"],
  },
  {
    id: "copy-files",
    title: "Copy files with confirmation",
    description: "Copy files with interactive confirmation and error handling",
    category: "File Operations",
    template: `# Copy files with confirmation
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
fi`,
    tags: ["copy", "cp", "file", "confirmation"],
  },
  {
    id: "move-files",
    title: "Move files safely",
    description: "Move files with backup and error handling",
    category: "File Operations",
    template: `# Move files with backup
# Change SOURCE and DEST to your paths
SOURCE="/path/to/source"
DEST="/path/to/destination"

# Create backup before moving
if [ -f "$SOURCE" ]; then
    cp "$SOURCE" "\${SOURCE}.backup.\$(date +%Y%m%d_%H%M%S)"
    mv "$SOURCE" "$DEST"
    echo "File moved successfully with backup created"
else
    echo "Source file does not exist"
    exit 1
fi`,
    tags: ["move", "mv", "backup", "safe"],
  },

  // Loops
  {
    id: "for-loop-files",
    title: "For loop through files",
    description: "Process multiple files in a directory",
    category: "Loops",
    template: `# Loop through files in a directory
# Change DIRECTORY to your target directory
DIRECTORY="/path/to/files"

for file in "$DIRECTORY"/*; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        # Add your processing logic here
        # Example: process_file "$file"
    fi
done

echo "All files processed"`,
    tags: ["loop", "files", "for", "process"],
  },
  {
    id: "while-loop-read",
    title: "While loop reading input",
    description: "Read input line by line and process it",
    category: "Loops",
    template: `# Read input line by line
# You can pipe input: echo "line1\\nline2" | ./script.sh
while IFS= read -r line; do
    echo "Processing line: $line"
    # Add your processing logic here
    # Example: process_line "$line"
done

echo "Finished processing all input"`,
    tags: ["loop", "while", "read", "input"],
  },
  {
    id: "for-loop-range",
    title: "For loop with range",
    description: "Loop through a range of numbers",
    category: "Loops",
    template: `# Loop through a range of numbers
# Change START and END to your desired range
START=1
END=10

for i in $(seq $START $END); do
    echo "Processing item $i"
    # Add your processing logic here
    # Example: process_item $i
done

echo "Finished processing range $START to $END"`,
    tags: ["loop", "range", "numbers", "seq"],
  },

  // Conditionals
  {
    id: "if-else-basic",
    title: "Basic if/else condition",
    description: "Simple conditional logic with error handling",
    category: "Conditionals",
    template: `# Basic if/else condition
# Change CONDITION to your actual condition
CONDITION="test"

if [ "$CONDITION" = "test" ]; then
    echo "Condition is true"
    # Add your logic here
else
    echo "Condition is false"
    # Add your alternative logic here
fi`,
    tags: ["if", "else", "condition", "basic"],
  },
  {
    id: "if-file-exists",
    title: "Check if file exists",
    description: "Check file existence and handle accordingly",
    category: "Conditionals",
    template: `# Check if file exists
# Change FILE_PATH to your file path
FILE_PATH="/path/to/file"

if [ -f "$FILE_PATH" ]; then
    echo "File exists: $FILE_PATH"
    # Add your logic for existing file
else
    echo "File does not exist: $FILE_PATH"
    # Add your logic for missing file
fi`,
    tags: ["if", "file", "exists", "check"],
  },
  {
    id: "if-directory-exists",
    title: "Check if directory exists",
    description: "Check directory existence and create if needed",
    category: "Conditionals",
    template: `# Check if directory exists and create if needed
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
fi`,
    tags: ["if", "directory", "mkdir", "create"],
  },

  // System Operations
  {
    id: "system-info",
    title: "System information",
    description: "Get basic system information",
    category: "System Operations",
    template: `# Get system information
echo "=== System Information ==="
echo "Hostname: $(hostname)"
echo "OS: $(uname -s)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "Uptime: $(uptime)"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
echo "Disk Usage: $(df -h / | tail -1 | awk '{print $5}')"
echo "========================"`,
    tags: ["system", "info", "hostname", "uptime"],
  },
  {
    id: "log-rotation",
    title: "Log rotation",
    description: "Rotate log files with compression",
    category: "System Operations",
    template: `# Rotate log files
# Change LOG_FILE to your log file path
LOG_FILE="/var/log/your-app.log"
MAX_SIZE="100M"

# Check if log file exists and is larger than max size
if [ -f "$LOG_FILE" ] && [ $(stat -c%s "$LOG_FILE") -gt $(numfmt --from=iec $MAX_SIZE) ]; then
    echo "Rotating log file: $LOG_FILE"
    
    # Create backup with timestamp
    mv "$LOG_FILE" "\${LOG_FILE}.\$(date +%Y%m%d_%H%M%S)"
    
    # Compress old log
    gzip "\${LOG_FILE}.\$(date +%Y%m%d_%H%M%S)"
    
    # Create new log file
    touch "$LOG_FILE"
    
    echo "Log rotation completed"
else
    echo "Log file does not need rotation"
fi`,
    tags: ["log", "rotation", "compress", "gzip"],
  },
  {
    id: "process-monitor",
    title: "Process monitoring",
    description: "Monitor a process and restart if needed",
    category: "System Operations",
    template: `# Monitor and restart process if needed
# Change PROCESS_NAME to your process name
PROCESS_NAME="your-process"
RESTART_CMD="systemctl restart your-service"

if pgrep -x "$PROCESS_NAME" > /dev/null; then
    echo "$PROCESS_NAME is running"
else
    echo "$PROCESS_NAME is not running, restarting..."
    $RESTART_CMD
    
    # Wait a moment and check again
    sleep 5
    if pgrep -x "$PROCESS_NAME" > /dev/null; then
        echo "$PROCESS_NAME restarted successfully"
    else
        echo "Failed to restart $PROCESS_NAME"
        exit 1
    fi
fi`,
    tags: ["process", "monitor", "restart", "service"],
  },

  // Database Operations
  {
    id: "mysql-backup",
    title: "MySQL database backup",
    description: "Create a MySQL database backup with timestamp",
    category: "Database Operations",
    template: `# MySQL database backup
# Change these variables to your database details
DB_NAME="your_database"
DB_USER="your_username"
DB_PASS="your_password"
BACKUP_DIR="/path/to/backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/\${DB_NAME}_\$(date +%Y%m%d_%H%M%S).sql"

# Create the backup
mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Database backup created: $BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "Backup compressed: \${BACKUP_FILE}.gz"
else
    echo "Database backup failed"
    exit 1
fi`,
    tags: ["mysql", "database", "backup", "mysqldump"],
  },
  {
    id: "postgres-backup",
    title: "PostgreSQL database backup",
    description: "Create a PostgreSQL database backup with timestamp",
    category: "Database Operations",
    template: `# PostgreSQL database backup
# Change these variables to your database details
DB_NAME="your_database"
DB_USER="your_username"
BACKUP_DIR="/path/to/backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/\${DB_NAME}_\$(date +%Y%m%d_%H%M%S).sql"

# Create the backup
pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Database backup created: $BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "Backup compressed: \${BACKUP_FILE}.gz"
else
    echo "Database backup failed"
    exit 1
fi`,
    tags: ["postgres", "postgresql", "database", "backup", "pg_dump"],
  },
];

export const bashSnippetCategories = [
  "File Operations",
  "Loops",
  "Conditionals",
  "System Operations",
  "Database Operations",
];

export function searchBashSnippets(query: string): BashSnippet[] {
  const lowercaseQuery = query.toLowerCase();
  return bashSnippets.filter(
    (snippet) =>
      snippet.title.toLowerCase().includes(lowercaseQuery) ||
      snippet.description.toLowerCase().includes(lowercaseQuery) ||
      snippet.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)) ||
      snippet.category.toLowerCase().includes(lowercaseQuery)
  );
}
