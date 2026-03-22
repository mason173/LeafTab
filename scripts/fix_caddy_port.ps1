$ServerIP = $env:LEAFTAB_SERVER_IP
if (-not $ServerIP) { $ServerIP = "YOUR_SERVER_IP" }
$User = $env:LEAFTAB_SERVER_USER
if (-not $User) { $User = "root" }

Write-Host ">>> Fixing Port Conflict on Server..."

ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} "
    echo '>>> 1. Stopping Nginx (releasing port 80)...'
    systemctl stop nginx
    systemctl disable nginx
    
    echo '>>> 2. Restarting Caddy...'
    systemctl restart caddy
    
    echo '>>> 3. Checking Caddy Status...'
    systemctl status caddy --no-pager
"
