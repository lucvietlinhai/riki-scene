#!/bin/bash

# Thư mục chứa script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Thêm đường dẫn phổ biến để tìm Node.js/npm
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:$PATH"

# Load NVM nếu có
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
fi

echo "Starting Riki Scene..."
npm start
