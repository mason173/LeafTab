$ServerIP = $env:LEAFTAB_SERVER_IP
if (-not $ServerIP) { $ServerIP = "YOUR_SERVER_IP" }
$User = $env:LEAFTAB_SERVER_USER
if (-not $User) { $User = "root" }

Write-Host ">>> Updating Caddy configuration on remote server..."

# 1. Upload Caddyfile
Write-Host ">>> Uploading Caddyfile..."
scp -o StrictHostKeyChecking=no Caddyfile ${User}@${ServerIP}:/etc/caddy/Caddyfile
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to upload Caddyfile"; exit 1 }

# 2. Reload Caddy
Write-Host ">>> Reloading Caddy service..."
ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} "caddy reload --config /etc/caddy/Caddyfile || systemctl reload caddy"

if ($LASTEXITCODE -eq 0) {
    Write-Host ">>> ✅ Caddy configuration updated and reloaded successfully!"
} else {
    Write-Error "Failed to reload Caddy"
    exit 1
}
