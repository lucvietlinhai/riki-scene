#!/bin/bash

# =====================================================
#  RIKI SCENE | Khởi động tự động (macOS / Linux)
# =====================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo " ====================================================="
echo "  RIKI SCENE | Khởi động tự động"
echo " ====================================================="
echo ""

# ===========================================================
# KIỂM TRA NODE.JS
# ===========================================================

# Thêm các đường dẫn phổ biến để tìm Node.js
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:$PATH"

# Thêm nvm nếu có
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
fi
if [ -s "$HOME/.nvm/bash_completion" ]; then
    source "$HOME/.nvm/bash_completion"
fi

if ! command -v node &>/dev/null; then
    echo " [LỖI] Không tìm thấy Node.js trên máy tính này."
    echo ""
    echo " Vui lòng tải và cài đặt Node.js tại:"
    echo " https://nodejs.org  (chọn phiên bản LTS)"
    echo ""
    echo " Sau khi cài xong, chạy lại file này."
    echo ""
    read -r -p " Nhấn Enter để thoát..."
    exit 1
fi

NODE_VER=$(node -v)
echo " [OK] Node.js $NODE_VER đã được cài đặt."
echo ""

# ===========================================================
# BƯỚC 1 — CÀI ĐẶT GÓI NPM (sharp, ffmpeg-static, electron)
# ===========================================================

echo " [1/3] Cài đặt các gói thư viện npm..."
echo "       (chỉ cần thiết lần đầu hoặc khi có cập nhật)"
echo ""

if ! npm install --loglevel=warn; then
    echo ""
    echo " [LỖI] npm install thất bại!"
    echo " Kiểm tra kết nối mạng và thử lại."
    echo ""
    read -r -p " Nhấn Enter để thoát..."
    exit 1
fi

echo " [OK] Các gói npm đã sẵn sàng."
echo ""

# ===========================================================
# BƯỚC 2 — TẢI UV VÀ CÀI PYTHON TTS
# ===========================================================

echo " [2/3] Cài đặt môi trường TTS..."
echo "       (chỉ cần thiết lần đầu, có thể mất 2-5 phút)"
echo ""

if ! npm run setup; then
    echo ""
    echo " [LỖI] Cài đặt môi trường TTS thất bại!"
    echo " Kiểm tra kết nối Internet và thử lại."
    echo ""
    read -r -p " Nhấn Enter để thoát..."
    exit 1
fi

echo ""
echo " [OK] Môi trường TTS đã sẵn sàng."
echo ""

# ===========================================================
# BƯỚC 3 — KHỞI CHẠY ỨNG DỤNG
# ===========================================================

echo " [3/3] Đang khởi động Riki Scene..."
echo ""
echo " ====================================================="
echo "  Ứng dụng đang mở. Chúc bạn sử dụng vui vẻ!"
echo " ====================================================="
echo ""

npm start
