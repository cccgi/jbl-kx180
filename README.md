# JBL KX-180 Bridge Control Panel

A modern, high-performance web-based control panel for the **JBL KX-180** digital mixer. This project allows you to control your mixer from any device (Phone, Tablet, PC) on your local network.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.x-green.svg)

## 🌟 Features
- **Real-Time Control:** Instantly sync volume, EQ, and effects across multiple connected devices.
- **Modern UI:** Premium look with **Light & Dark themes** (selectable in Settings).
- **Full Mixing Capabilities:**
  - Master Volumes (Music, Mic, Effect, Center, Sub).
  - Individual Channel Control (Mic 1, Mic 2).
  - 15-Band Music & Microphone EQ.
  - Advanced Echo & Reverb parameters + 5-Band Effect EQ.
- **Preset Recall:** Support for all 10 hardware presets (P01-P07 + Factory POP/PRO/STE).
- **Multi-Device Sync:** Changes on one device are instantly reflected on all others.
- **Raspberry Pi Optimized:** Can run as a dedicated bridge server, freeing up your workstation.

## 🏗️ Architecture
- **Bridge Server (`bridge.cjs`):** A Node.js backend using `node-hid` to talk to the mixer via USB. It acts as the "Source of Truth" using Socket.io.
- **Web UI:** A responsive React application built with Vite, optimized for landscape and portrait modes on mobile devices.

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher.
- USB connection to the JBL KX-180.

### Installation (Windows PC)
1. Clone the repository:
   ```bash
   git clone https://github.com/cccgi/jbl-kx180.git
   cd jbl-kx180/web-ui
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Bridge Server:
   ```bash
   node bridge.cjs
   ```
4. Start the Web UI:
   ```bash
   npm run dev
   ```

### Installation (Raspberry Pi)
Please refer to the detailed **[Raspberry Pi Setup Guide](setup-rpi.md)**.
1. Run `sudo bash setup-rpi.sh` to install dependencies and configure USB permissions.
2. Start the server and UI as described in the guide.

## ⚙️ Usage
- **Connect:** Open Settings ⚙️ and click **"LOCK HARDWARE"** to establish the USB connection.
- **Theme:** Toggle between Light and Dark modes in Settings.
- **Remote Access:** To access from your phone, run `npm run dev -- --host` and visit `http://YOUR-PC-IP:5173`.

## 🛠️ Credits
Developed for the KX-180 community.
