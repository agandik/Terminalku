<div align="center">
  <img src="public/logo.svg" alt="Terminalku Logo" width="120" height="120" />
  <h1>Terminalku</h1>
  <p>Desktop remote access client — SSH, Telnet, Serial, FTP, and local terminal in one place.</p>

  [![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue.svg)](https://v2.tauri.app/)
  [![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
  [![Rust](https://img.shields.io/badge/Rust-1.75+-orange.svg)](https://www.rust-lang.org/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

---

Terminalku is a desktop app built for network engineers and sysadmins who manage a lot of devices. It handles SSH, Telnet, Serial console, FTP/FTPS, and a local PTY shell — all in one window with a multi-tab interface. Built with Tauri v2 (Rust) and React 19, so it's fast and doesn't eat memory like Electron-based alternatives.

---

## Features

### Serial Console

Plug in a USB-to-Serial adapter and Terminalku picks it up automatically — no need to manually type `/dev/ttyUSB0` every time. Baud rate detection runs in under 0.4 seconds using ASCII ratio analysis, so you get a clean prompt right away. If you hit a `Permission Denied` on Linux, there's a one-click fix that adds you to the `dialout` group and sets up the right udev rule without having to touch the terminal yourself.

Other things it handles: releasing locked ports (`EBUSY`) automatically and filtering out the garbage bytes that show up when the baud rate is wrong at startup.

### SSH & Telnet

SSH v2 with password or private key auth (RSA, ED25519, ECDSA). Telnet handles IAC negotiation and auto-submits credentials when it sees a login prompt. Both reconnect automatically if the connection drops.

### Multi-Tab & Split View

Open multiple sessions in tabs, split them side by side, and switch between them with keyboard shortcuts. `Ctrl+B` toggles the sidebar, `Ctrl+F` opens terminal search. There's also a local shell tab if you need a quick bash/zsh session without spinning up a new terminal window.

### FTP / FTPS

Dual-pane file manager — local files on the left, remote on the right. Supports plain FTP and FTPS (TLS).

### Vendor Detection

Terminalku reads the console banner when a session opens and tries to identify the hardware — Cisco, MikroTik, Huawei, Juniper, Linux. When it recognizes a vendor, the command palette shows relevant commands for that device type. It's passive, nothing gets sent to the device.

### Snippet Library

Save commands you use often into a local SQLite database. Filter by vendor, click to send. Useful when you find yourself typing the same `show` commands dozens of times a day.

### Themes & Updates

Light and dark mode, follows your system setting by default. There's also a live preview for theme changes that rolls back automatically if you close the dialog without saving.

Auto-updater runs in the background on startup — if there's a new version, it shows a modal with release notes and a progress bar. No need to re-download manually.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Core | [Tauri v2](https://v2.tauri.app/) (Rust + Webview) |
| Protocols | `russh` (SSH), `tokio-serial` (Serial), `suppaftp` (FTP), `portable-pty` (Local PTY) |
| Frontend | React 19, TypeScript, Vite, Vanilla CSS |
| Terminal | `@xterm/xterm` v5 |
| Storage | SQLite + OS keyring |

---

## Installation

**Requirements:** Debian 11+ / Ubuntu 22.04+ / Linux Mint 21+, `amd64`.

### APT Repository (recommended — gets updates automatically)

```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://agandik.github.io/Terminalku/KEY.gpg \
  | sudo tee /etc/apt/keyrings/terminalku-archive-keyring.gpg > /dev/null

echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/terminalku-archive-keyring.gpg] https://agandik.github.io/Terminalku/apt-repo stable main" \
  | sudo tee /etc/apt/sources.list.d/terminalku.list > /dev/null

sudo apt update && sudo apt install terminalku
```

After that, `sudo apt upgrade` will keep it up to date like any other package.

### Direct .deb download

```bash
wget https://agandik.github.io/Terminalku/apt-repo/pool/main/t/terminalku/terminalku_0.1.0_amd64.deb
sudo apt install ./terminalku_0.1.0_amd64.deb
```

### AppImage (no install)

Download `Terminalku_0.1.0_amd64.AppImage` from [Releases](https://github.com/agandik/Terminalku/releases), then:

```bash
chmod +x Terminalku_0.1.0_amd64.AppImage
./Terminalku_0.1.0_amd64.AppImage
```

---

## Uninstall

```bash
# Remove the package
sudo apt remove terminalku

# Or purge including config files
sudo apt purge terminalku

# Clean up the repo entry if you added it
sudo rm /etc/apt/sources.list.d/terminalku.list
sudo rm /etc/apt/keyrings/terminalku-archive-keyring.gpg
```

For AppImage, just delete the file.

---

## License

MIT — see [LICENSE](LICENSE).
