# Server Configuration
$ServerIP = $env:LEAFTAB_SERVER_IP
if (-not $ServerIP) { $ServerIP = "YOUR_SERVER_IP" }
$User = $env:LEAFTAB_SERVER_USER
if (-not $User) { $User = "root" }
$RemoteDir = $env:LEAFTAB_REMOTE_DIR
if (-not $RemoteDir) { $RemoteDir = "/var/www/leaftab" }
$BackendRemoteDir = $env:LEAFTAB_BACKEND_REMOTE_DIR
if (-not $BackendRemoteDir) { $BackendRemoteDir = "/var/www/leaftab-server" }
$PublicOrigin = $env:LEAFTAB_PUBLIC_ORIGIN
if (-not $PublicOrigin) { $PublicOrigin = "https://example.com" }

# 1. Build Frontend
Write-Host ">>> Checking for npm..."
if (Get-Command "npm" -ErrorAction SilentlyContinue) {
    Write-Host ">>> npm found. Building frontend..."
    # Use npm.cmd on Windows to bypass PowerShell execution policy issues
    if ($env:OS -match "Windows") {
        npm.cmd run build
    } else {
        npm run build
    }
    if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }
} else {
    Write-Host ">>> npm NOT found."
    if (Test-Path "build") {
        Write-Warning "Using existing 'build' directory because npm is missing."
        Write-Warning "Note: Changes in 'src' will NOT be deployed until you install Node.js and rebuild."
    } else {
        Write-Error "npm is missing AND 'build' directory does not exist."
        Write-Error "Please install Node.js from https://nodejs.org/ to build the project."
        exit 1
    }
}

# 2. Check and Install Caddy
Write-Host ">>> Checking if Caddy is installed..."
$CaddyCheck = ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} "command -v caddy"
if (-not $CaddyCheck) {
    Write-Host ">>> Caddy NOT found. Uploading installer..."
    scp -o StrictHostKeyChecking=no install_caddy.sh "${User}@${ServerIP}:/tmp/install_caddy.sh"
    Write-Host ">>> Running installer (This may take a minute)..."
    ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} "chmod +x /tmp/install_caddy.sh && bash /tmp/install_caddy.sh"
    if ($LASTEXITCODE -ne 0) { Write-Error "Caddy installation failed"; exit 1 }
} else {
    Write-Host ">>> Caddy is already installed."
}

# 3. Upload Frontend Files
Write-Host ">>> Uploading Frontend files to server..."
# Create remote directory and config directory
ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} "mkdir -p ${RemoteDir} && mkdir -p /etc/caddy"
# Upload build folder contents
scp -o StrictHostKeyChecking=no -r build/* "${User}@${ServerIP}:${RemoteDir}/"
# Upload Caddyfile (Assumes Caddyfile is in deployment/Caddyfile, checking current location)
if (Test-Path "deployment/Caddyfile") {
    scp -o StrictHostKeyChecking=no deployment/Caddyfile "${User}@${ServerIP}:/etc/caddy/Caddyfile"
} elseif (Test-Path "Caddyfile") {
    scp -o StrictHostKeyChecking=no Caddyfile "${User}@${ServerIP}:/etc/caddy/Caddyfile"
} else {
    Write-Warning "Caddyfile not found!"
}

# 4. Deploy Backend
Write-Host ">>> Deploying Backend..."
ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} "mkdir -p ${BackendRemoteDir}"
# Upload required server files explicitly (scp exclude rules are limited).
Write-Host ">>> Uploading server files..."
scp -o StrictHostKeyChecking=no server/package.json server/package-lock.json server/index.js server/clear_users.js "${User}@${ServerIP}:${BackendRemoteDir}/"

# Install Backend Dependencies
Write-Host ">>> Installing backend dependencies on server..."
ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} "cd ${BackendRemoteDir} && npm install --production"

# Setup Systemd Service
Write-Host ">>> Configuring Backend Service..."
if (Test-Path "deployment/leaftab-backend.service") {
    scp -o StrictHostKeyChecking=no deployment/leaftab-backend.service "${User}@${ServerIP}:/etc/systemd/system/leaftab-backend.service"
    ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} "systemctl daemon-reload && systemctl enable leaftab-backend && systemctl restart leaftab-backend"
} else {
    Write-Warning "leaftab-backend.service file not found in deployment folder."
}

# 5. Restart Caddy
Write-Host ">>> Restarting Caddy on server..."
ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} "caddy reload --config /etc/caddy/Caddyfile || systemctl reload caddy || caddy start --config /etc/caddy/Caddyfile"

Write-Host ">>> Deployment Complete!"
Write-Host "Visit $PublicOrigin to verify."
