#!/bin/bash

# Exit on error
set -e

SERVER_IP="${LEAFTAB_SERVER_IP:-YOUR_SERVER_IP}"
USER="${LEAFTAB_SERVER_USER:-root}"
OLD_DB_PATH="${LEAFTAB_OLD_DB_PATH:-/path/to/old/users.db}"
NEW_DB_PATH="${LEAFTAB_NEW_DB_PATH:-/var/www/leaftab-server/users.db}"

echo ">>> 连接服务器并尝试迁移数据库..."

ssh -t ${USER}@${SERVER_IP} "
if [ -f ${OLD_DB_PATH} ]; then
    echo '>>> 发现旧数据库: ${OLD_DB_PATH}'
    
    # Check if new DB already exists and has size (meaning it might have new data)
    if [ -f ${NEW_DB_PATH} ]; then
        echo '>>> 注意：新目录下已存在数据库文件。'
        echo '>>> 正在备份新数据库为 users.db.bak ...'
        mv ${NEW_DB_PATH} ${NEW_DB_PATH}.bak
    fi

    echo '>>> 停止后端服务...'
    systemctl stop leaftab-backend

    echo '>>> 复制旧数据库到新位置...'
    cp ${OLD_DB_PATH} ${NEW_DB_PATH}
    
    echo '>>> 设置权限...'
    # Assuming the service runs as root based on service file, but good practice to check ownership
    # For now we keep it as is since service user is root
    
    echo '>>> 重启后端服务...'
    systemctl start leaftab-backend
    
    echo '>>> ✅ 数据库迁移成功！旧用户数据已恢复。'
else
    echo '>>> ❌ 未在默认位置 (${OLD_DB_PATH}) 找到旧数据库。'
    echo '>>> 请手动检查旧数据库位置。'
fi
"
