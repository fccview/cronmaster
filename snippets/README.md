# User Snippets Directory

This directory allows you to create your own bash script snippets that will automatically be recognized by the Cronjob Manager application.

## How to Create a Snippet

1. Create a new `.sh` file in this directory
2. Add metadata comments at the top of the file using the following format:

```bash
# @id: your-snippet-id
# @title: Your Snippet Title
# @description: A brief description of what this snippet does
# @category: Your Category
# @tags: tag1,tag2,tag3

# Your bash script content goes here
echo "Hello World!"
```

## Metadata Fields

- **@id**: A unique identifier for your snippet (use lowercase, hyphens for spaces)
- **@title**: A human-readable title for your snippet
- **@description**: A brief description of what the snippet does
- **@category**: The category this snippet belongs to (e.g., "File Operations", "System Operations", etc.)
- **@tags**: Comma-separated list of tags for searching

## Example

Here's an example snippet file:

```bash
# @id: my-custom-backup
# @title: My Custom Backup Script
# @description: A custom backup script for my specific needs
# @category: File Operations
# @tags: backup,custom,personal

# My custom backup logic
SOURCE_DIR="/home/user/documents"
BACKUP_DIR="/backup/documents"

rsync -av "$SOURCE_DIR/" "$BACKUP_DIR/"
echo "Custom backup completed at $(date)"
```

## Notes

- Only files with `.sh` extension will be recognized
- All metadata fields are required for the snippet to be loaded
- The script content should start after the metadata comments
- Your snippets will appear alongside the built-in snippets in the application
- You can organize snippets into subdirectories if needed

## Categories

You can use any category name you want, but here are some common ones:

- File Operations
- System Operations
- Database Operations
- Loops
- Conditionals
- User Examples
- Custom Scripts
