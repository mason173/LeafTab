$ServerIP = $env:LEAFTAB_SERVER_IP
if (-not $ServerIP) { $ServerIP = "YOUR_SERVER_IP" }
$User = "root"
$KeyPath = "$env:USERPROFILE\.ssh\id_ed25519"

Write-Host ">>> Setting up SSH Keys for password-less login..."

# 1. Check/Generate SSH Key
if (-not (Test-Path "$KeyPath")) {
    Write-Host ">>> Generating new SSH key pair..."
    # Using cmd /c to ensure empty passphrase ("") is passed correctly to ssh-keygen
    # PowerShell sometimes drops empty arguments to native commands
    cmd /c "ssh-keygen -t ed25519 -f `"$KeyPath`" -N `"`""
    
    if (-not (Test-Path "$KeyPath.pub")) {
        Write-Error "SSH Key generation failed!"
        exit 1
    }
} else {
    Write-Host ">>> SSH key already exists."
}

# 2. Upload Public Key to Server
Write-Host ">>> Uploading public key to server..."
Write-Host "⚠️  IMPORTANT: You will be asked for your server password one last time!"

if (-not (Test-Path "$KeyPath.pub")) {
    Write-Error "Public key file not found at $KeyPath.pub"
    exit 1
}

# Use piping to robustly transfer the key content (avoids quoting issues in SSH command)
Get-Content "$KeyPath.pub" | ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n>>> ✅ Success! SSH Key configured."
    Write-Host ">>> Testing password-less connection..."
    # Test connection
    ssh -o StrictHostKeyChecking=no -o BatchMode=yes ${User}@${ServerIP} "echo 'Connection established without password!'"
} else {
    Write-Error "Failed to upload key. Please check your password and try again."
}
