# @id: clean-temp
# @title: Clean temporary files
# @description: Remove old temporary files
# @category: File Operations
# @tags: temp,cleanup,maintenance

# Clean temporary files
# Remove files older than 7 days

find /tmp -type f -atime +7 -delete
find /tmp -type d -empty -delete
find ~/.cache -type f -atime +30 -delete 