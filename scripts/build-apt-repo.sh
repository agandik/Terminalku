#!/usr/bin/env bash
#
# Membangun ulang metadata APT repository di apt-repo/ dari isi apt-repo/pool/.
#
# Pakai:
#   scripts/build-apt-repo.sh [path/ke/paket.deb ...]
#
# Setiap .deb yang diberikan akan disalin ke pool/main/t/terminalku/ lebih dulu.
# Tanpa argumen, skrip hanya meng-index ulang isi pool/ yang sudah ada.
#
# Butuh: dpkg-dev (dpkg-scanpackages), apt-utils (apt-ftparchive), gnupg.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APT_REPO="$REPO_ROOT/apt-repo"
POOL_DIR="$APT_REPO/pool/main/t/terminalku"
DIST_DIR="$APT_REPO/dists/stable"
BIN_DIR="$DIST_DIR/main/binary-amd64"

# Kunci penandatangan arsip. Timpa lewat env kalau pakai kunci lain.
GPG_KEY_ID="${GPG_KEY_ID:-62A5578C7995235E2CEB7970243638B1615315EA}"

for tool in dpkg-scanpackages apt-ftparchive gpg; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "error: '$tool' tidak ditemukan. Install dpkg-dev, apt-utils, dan gnupg." >&2
    exit 1
  }
done

mkdir -p "$POOL_DIR" "$BIN_DIR"

# Salin paket baru ke pool kalau ada argumen. Tauri memberi nama berkas dengan
# huruf besar (Terminalku_...), tapi URL GitHub Pages peka huruf besar/kecil —
# jadi normalkan ke huruf kecil sesuai konvensi Debian agar link di README cocok.
for deb in "$@"; do
  [ -f "$deb" ] || { echo "error: berkas tidak ada: $deb" >&2; exit 1; }
  dest="$(basename "$deb" | tr '[:upper:]' '[:lower:]')"
  echo "==> Menyalin $(basename "$deb") ke pool/ sebagai $dest"
  cp -f "$deb" "$POOL_DIR/$dest"
done

shopt -s nullglob
debs=("$POOL_DIR"/*.deb)
shopt -u nullglob
[ ${#debs[@]} -gt 0 ] || { echo "error: tidak ada .deb di $POOL_DIR" >&2; exit 1; }

# Index paket. stderr dibuang ke terminal, JANGAN ke berkas Packages —
# baris "dpkg-scanpackages: warning/info" akan merusak parser APT.
echo "==> Membuat Packages (${#debs[@]} paket)"
( cd "$APT_REPO" && dpkg-scanpackages --multiversion pool/ ) > "$BIN_DIR/Packages"
gzip -9cn "$BIN_DIR/Packages" > "$BIN_DIR/Packages.gz"

# Release harus memuat checksum Packages* yang baru, jadi selalu digenerate ulang.
echo "==> Membuat Release"
apt-ftparchive \
  -o APT::FTPArchive::Release::Origin=Terminalku \
  -o APT::FTPArchive::Release::Label=Terminalku \
  -o APT::FTPArchive::Release::Suite=stable \
  -o APT::FTPArchive::Release::Codename=stable \
  -o APT::FTPArchive::Release::Architectures=amd64 \
  -o APT::FTPArchive::Release::Components=main \
  -o APT::FTPArchive::Release::Description="Terminalku APT Repository" \
  release "$DIST_DIR" > "$DIST_DIR/Release"

echo "==> Menandatangani Release dengan $GPG_KEY_ID"
rm -f "$DIST_DIR/Release.gpg" "$DIST_DIR/InRelease"
gpg --batch --yes --default-key "$GPG_KEY_ID" -abs \
  -o "$DIST_DIR/Release.gpg" "$DIST_DIR/Release"
gpg --batch --yes --default-key "$GPG_KEY_ID" --clearsign \
  -o "$DIST_DIR/InRelease" "$DIST_DIR/Release"

# Kunci publik yang dipakai klien di README. Format biner (bukan ASCII-armor)
# supaya bisa langsung ditaruh di /etc/apt/keyrings/ tanpa dearmor.
echo "==> Mengekspor KEY.gpg"
gpg --batch --yes --export "$GPG_KEY_ID" > "$REPO_ROOT/KEY.gpg"

echo
echo "Selesai. Verifikasi cepat:"
echo "  gpg --verify $DIST_DIR/InRelease"
echo "  grep -c '^Package:' $BIN_DIR/Packages"
