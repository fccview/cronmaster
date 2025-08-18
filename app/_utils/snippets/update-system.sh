# @id: update-system
# @title: Update system packages
# @description: Update system packages and clean cache
# @category: System Operations
# @tags: update,packages,maintenance

# Update system packages
# Update and clean package cache

apt-get update
apt-get upgrade -y
apt-get autoremove -y
apt-get clean 