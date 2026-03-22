$ServerIP = $env:LEAFTAB_SERVER_IP
if (-not $ServerIP) { $ServerIP = "YOUR_SERVER_IP" }
$User = $env:LEAFTAB_SERVER_USER
if (-not $User) { $User = "root" }

Write-Host ">>> Connecting to server to debug Caddy..."

ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} "
    echo '=== 1. Validating Caddyfile ==='
    caddy validate --config /etc/caddy/Caddyfile
    
    echo '=== 2. Checking Port 80/443 Usage ==='
    netstat -tulpn | grep -E ':(80|443)' || ss -tulpn | grep -E ':(80|443)'
    
    echo '=== 3. Caddy Service Status ==='
    systemctl status caddy --no-pager
    
    echo '=== 4. Recent Caddy Logs ==='
    journalctl -u caddy -n 20 --no-pager
"
