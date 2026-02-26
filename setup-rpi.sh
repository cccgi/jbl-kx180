#!/bin/bash
# Raspberry Pi Setup Script for KX180 Bridge
# Run with: sudo bash setup-rpi.sh

echo "--- KX180 Bridge RPi Setup ---"

# 1. Update and install system dependencies
echo "[1/4] Installing system dependencies..."
apt-get update
apt-get install -y libusb-1.0-0-dev pkg-config build-essential curlt

# 2. Install Node.js (if not present or old)
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    echo "[2/4] Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo "[2/4] Node.js $(node -v) already installed."
fi

# 3. Setup Udev Rules for KX180 (VID: 0x1210, PID: 0x0042)
echo "[3/4] Configuring USB permissions (udev)..."
cat <<EOF > /etc/udev/rules.d/99-kx180.rules
SUBSYSTEM=="usb", ATTR{idVendor}=="1210", ATTR{idProduct}==0042, MODE="0666", GROUP="plugdev"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1210", ATTRS{idProduct}==0042, MODE="0666", GROUP="plugdev"
EOF
udevadm control --reload-rules
udevadm trigger

# 4. Install Project Dependencies
echo "[4/4] Installing npm dependencies..."
# Navigate to web-ui if the script is in the root
if [ -d "web-ui" ]; then
    cd web-ui
fi
npm install

echo "--- Setup Complete! ---"
echo "To start the bridge server, run: node bridge.cjs"
echo "To start the web UI, run: npm run dev"
