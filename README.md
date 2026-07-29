<div align="center">
  <img src="public/logo.svg" alt="Terminalku Logo" width="120" height="120" />
  <h1>Terminalku</h1>
  <p><strong>Next-Gen Desktop Remote Access Client (SSH, Serial, Telnet, FTP & Local Terminal)</strong></p>

  [![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue.svg)](https://v2.tauri.app/)
  [![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
  [![Rust](https://img.shields.io/badge/Rust-1.75+-orange.svg)](https://www.rust-lang.org/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

---

## 📖 Overview

**Terminalku** is a modern, ultra-fast, and lightweight desktop application engineered specifically for network engineers, system administrators, and developers. Built on **Tauri v2** and **React 19**, it provides an all-in-one remote access suite for **SSH**, **Telnet**, **Serial Console**, **FTP/FTPS**, and **Local Terminal (PTY)** sessions with a Termius-inspired user interface.

---

## ✨ Key Features

### 📡 1. Smart Serial Console & Hardware Management
- **Real-Time Port Discovery**: Automatically detects connected USB-to-Serial adapters (`/dev/ttyUSB*`, `/dev/ttyACM*`, `COM*`) on the fly.
- **Sub-Second Baud Rate Auto-Detection**: Uses pure ASCII ratio evaluation & prompt heuristics to accurately identify target baud rates (`38400`, `115200`, `9600`, `57600`, `19200`) in `<0.4s` without lag.
- **1-Click Dialout & udev Fix (Linux)**: Fixes `Permission Denied` errors in one click via `pkexec` (adds user to `dialout` group and creates `/etc/udev/rules.d/99-remote-app-serial.rules`).
- **Force Release on `EBUSY`**: Automatically kills lock files or background processes locking the serial device (`fuser -k -9`).
- **Framing Noise Sanitizer**: Filters out non-ASCII garbage bytes (`\uFFFD`) caused by mismatched initial baud rates.

### 🔐 2. Enterprise SSH & Telnet Engine
- **Full SSH v2 Suite**: Supports password & private key authentication (*RSA, ED25519, ECDSA*) with passphrase handling.
- **Telnet Auto-Expect Login**: Handles Telnet IAC negotiations (ECHO, SGA, NAWS) and performs automatic credential submission upon prompt detection.
- **Auto-Reconnect**: Seamlessly attempts connection recovery if network drops occur.

### 💻 3. Multi-Tab Workspace & Split Terminal
- **Local Shell (PTY)**: Integrated system terminal (`bash`, `zsh`, `powershell`, `cmd`) right inside the workspace.
- **Split-Screen Workspace**: Compare sessions in real-time with vertical and horizontal split views.
- **Termius-Style Multi-Tab UX**: Tab re-ordering, smooth keyboard shortcuts (`Ctrl+B` for sidebar, `Ctrl+F` for terminal search), and mouse wheel tab navigation.

### 📂 4. Dual-Pane FTP & FTPS File Manager
- **Side-by-Side File Explorer**: Browse local storage (left pane) and remote servers (right pane) simultaneously over secure TLS (FTPS).

### 🏷️ 5. Passive Vendor Detection & Command Presets
- **Hardware Recognition**: Passively detects vendor hardware & OS types from console banners (Cisco, MikroTik, Huawei, Juniper, Linux).
- **Contextual Command Palette**: Offers quick-action command presets tailored to the active tab's detected vendor.

### 📌 6. Snippet & Macro Library
- **Persistent Macro Library**: Save frequently used commands into a local SQLite database.
- **Vendor Filtering & 1-Click Dispatch**: Filter snippets by vendor category and send commands directly to active terminals in a single click.

### 🎨 7. Adaptive Appearance & Live Preview
- **Dynamic Light / Dark Theme**: Automatically adapts between Dark Mode and Light Mode based on system settings or user preference.
- **Live Preview & Safe Rollback**: Preview UI appearance changes live in the background, with instant auto-rollback if canceled without saving.

### 🚀 8. In-App Auto-Updater (Tauri v2)
- **Background Update Checker**: Checks for new version releases automatically on startup.
- **Sleek Update Modal**: View release notes, progress bars, and relaunch into new versions seamlessly.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Core Desktop** | [Tauri v2](https://v2.tauri.app/) (Rust + Webview) |
| **Protocol Engine** | `russh` (SSH), `tokio-serial` (Serial UART), `suppaftp` (FTP), `portable-pty` (Local PTY) |
| **Frontend UI** | React 19, TypeScript, Vite, Vanilla CSS, Lucide Icons |
| **Terminal Rendering** | `@xterm/xterm` v5 with `fit`, `web-links`, and `search` addons |
| **Local Storage** | SQLite (Profiles & Folders) + OS Native Credential Keyring |

---

## 📥 Installation for End-Users

### Debian / Ubuntu / Linux Mint (`.deb` Package via `apt`)

You can install **Terminalku** directly on Ubuntu, Debian, Linux Mint, or Pop!_OS using `sudo apt install`:

```bash
# 1. Download the latest .deb installer package from GitHub Releases
wget https://github.com/agandik/Terminalku/releases/download/v0.1.0/Terminalku_0.1.0_amd64.deb

# 2. Install using APT (automatically installs required system dependencies)
sudo apt install ./Terminalku_0.1.0_amd64.deb
```

Once installed, **Terminalku** will appear in your Desktop Application Launcher, or you can launch it from terminal by typing `terminalku`.

### Portable Linux AppImage (No Installation Required)

```bash
# Download and grant executable permission
chmod +x Terminalku_0.1.0_amd64.AppImage

# Run Terminalku directly
./Terminalku_0.1.0_amd64.AppImage
```


---

## 📄 Release & Auto-Updater Guide

For instructions on publishing new version releases and configuring the `updater.json` manifest for GitHub Releases, refer to [docs/UPDATER.md](docs/UPDATER.md).

---

## 📜 License

Distributed under the **MIT License**. Created and maintained for high-efficiency remote management. Copyright © 2026 Terminalku Team.
