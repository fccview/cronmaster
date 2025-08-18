# @id: check-ssl-cert
# @title: Check SSL certificate
# @description: Check SSL certificate expiration
# @category: System Operations
# @tags: ssl,certificate,security

# Check SSL certificate expiration
# Alert if certificate expires in less than 30 days

DOMAIN="example.com"
DAYS_LEFT=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2 | xargs -I {} date -d {} +%s | xargs -I {} echo $(( ({} - $(date +%s)) / 86400 )))

if [ "$DAYS_LEFT" -lt 30 ] && [ "$DAYS_LEFT" -gt 0 ]; then
    echo "SSL certificate for $DOMAIN expires in $DAYS_LEFT days" | mail -s "SSL Certificate Alert" admin@example.com
fi 