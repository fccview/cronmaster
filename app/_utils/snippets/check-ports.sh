# @id: check-ports
# @title: Check open ports
# @description: Check if specific ports are listening
# @category: System Operations
# @tags: ports,network,monitor

# Check if specific ports are listening
# Alert if required ports are not open

PORTS=("80" "443" "22" "3306")

for port in "${PORTS[@]}"; do
    if ! ss -tuln | grep -q ":$port "; then
        echo "Port $port is not listening" | mail -s "Port Alert" admin@example.com
    fi
done 