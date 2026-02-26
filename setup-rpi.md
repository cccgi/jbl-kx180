# Raspberry Pi Deployment Guide: KX180 Bridge

This guide explains how to deploy the KX180 Bridge project to a Raspberry Pi running Raspberry Pi OS (Debian-based).

## Prerequisites
- Raspberry Pi 3B+ or 4.
- USB connection to the JBL KX-180 Mixer.
- Network connection for the Web UI.

## 1. Transfer Files
Copy the `kx180-bridge` folder and the `setup-rpi.sh` script to your Raspberry Pi using SCP or a USB drive.

## 2. Run Setup Script
On the Raspberry Pi terminal, navigate to the folder and run the setup script:
```bash
chmod +x setup-rpi.sh
sudo ./setup-rpi.sh
```

### What the script does:
- Updates system packages.
- Installs `libusb`, `pkg-config`, and `build-essential` (needed for `node-hid`).
- Installs Node.js 18.
- Configures `udev` rules so the Pi can access the mixer over USB without root.
- Runs `npm install` for the project.

## 3. Running the Server
The bridge server acts as the middleware between the hardware and the clients.
```bash
cd web-ui
node bridge.cjs
```
The server will start on port `3001`.

## 4. Running the Web UI
To access the control panel from other devices (phone, tablet):
```bash
npm run dev -- --host
```
This will expose the Vite dev server to your local network. You can then visit `http://<pi-ip-address>:5173` on your devices.

## Troubleshooting
- **Mixer not found:** Ensure the USB cable is connected and try running `lsusb` to see if the device (VID: 0x1210) is listed.
- **Permission denied:** Check if `/etc/udev/rules.d/99-kx180.rules` exists and run `sudo udevadm trigger` again.
- **Node-HID build failure:** Ensure `libusb-1.0-0-dev` is installed before running `npm install`.
