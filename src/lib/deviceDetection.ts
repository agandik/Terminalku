// Modul Deteksi Vendor/OS Perangkat dan Presets Command Bawaan.

import type { DeviceVendor } from "./types";

export interface VendorInfo {
  id: DeviceVendor;
  name: string;
  badge: string;
  color: string;
}

export const VENDOR_MAP: Record<DeviceVendor, VendorInfo> = {
  auto: { id: "auto", name: "Auto-Detect", badge: "🤖 Auto", color: "#38bdf8" },
  cisco_ios: { id: "cisco_ios", name: "Cisco Router", badge: "🔵 Cisco Router", color: "#3b82f6" },
  cisco_ios_router: { id: "cisco_ios_router", name: "Cisco Router", badge: "🔵 Cisco Router", color: "#3b82f6" },
  cisco_ios_switch: { id: "cisco_ios_switch", name: "Cisco Switch", badge: "⚡ Cisco Switch", color: "#0284c7" },
  cisco_nxos: { id: "cisco_nxos", name: "Cisco NX-OS", badge: "🔷 Cisco NX-OS", color: "#0284c7" },
  mikrotik: { id: "mikrotik", name: "MikroTik RouterOS", badge: "🟢 MikroTik", color: "#00e676" },
  huawei_vrp: { id: "huawei_vrp", name: "Huawei VRP", badge: "🔴 Huawei", color: "#ff527b" },
  juniper_junos: { id: "juniper_junos", name: "Juniper JunOS", badge: "🟣 Juniper", color: "#a855f7" },
  linux: { id: "linux", name: "Linux / Unix", badge: "🐧 Linux", color: "#ffd166" },
  generic: { id: "generic", name: "Generic Terminal", badge: "⚡ Generic", color: "#94a3b8" },
};

export interface PresetCommand {
  command: string;
  label: string;
  category: "network" | "system" | "custom";
}

const CISCO_ROUTER_PRESETS: PresetCommand[] = [
  { command: "show ip interface brief", label: "Daftar Interface & IP", category: "network" },
  { command: "show ip bgp summary", label: "Status BGP Neighbor Summary", category: "network" },
  { command: "show ip bgp neighbors", label: "Detail BGP Neighbors", category: "network" },
  { command: "show ip route", label: "Tabel Routing IP", category: "network" },
  { command: "show running-config", label: "Lihat Konfigurasi Aktif", category: "network" },
  { command: "show cdp neighbors", label: "Tetangga CDP", category: "network" },
  { command: "show standby brief", label: "Status HSRP / Redundansi", category: "network" },
  { command: "show logging", label: "Log Perangkat", category: "network" },
  { command: "write memory", label: "Simpan Konfigurasi (write)", category: "network" },
  { command: "do write memory", label: "Simpan Konfigurasi Mode Config (do write)", category: "network" },
  { command: "do copy running-config startup-config", label: "Simpan Konfigurasi (do copy run start)", category: "network" },
  { command: "configure terminal", label: "Masuk Mode Konfigurasi", category: "network" },
];

const CISCO_SWITCH_PRESETS: PresetCommand[] = [
  { command: "show interfaces status", label: "Status Port Speed/Duplex/VLAN", category: "network" },
  { command: "show vlan brief", label: "Daftar VLAN & Port Access", category: "network" },
  { command: "show mac address-table", label: "Tabel MAC Address Switch", category: "network" },
  { command: "show interfaces trunk", label: "Status Port Trunking", category: "network" },
  { command: "show cdp neighbors", label: "Tetangga CDP Perangkat", category: "network" },
  { command: "show spanning-tree summary", label: "Status Spanning-Tree", category: "network" },
  { command: "show running-config", label: "Lihat Konfigurasi Aktif", category: "network" },
  { command: "write memory", label: "Simpan Konfigurasi (write)", category: "network" },
  { command: "do write memory", label: "Simpan Konfigurasi Mode Config (do write)", category: "network" },
  { command: "do copy running-config startup-config", label: "Simpan Konfigurasi (do copy run start)", category: "network" },
  { command: "configure terminal", label: "Masuk Mode Konfigurasi", category: "network" },
];

export const VENDOR_PRESETS: Record<DeviceVendor, PresetCommand[]> = {
  auto: [],
  generic: [
    { command: "help", label: "Help System", category: "system" },
    { command: "clear", label: "Clear Screen", category: "system" },
    { command: "history", label: "History", category: "system" },
  ],
  cisco_ios: CISCO_ROUTER_PRESETS,
  cisco_ios_router: CISCO_ROUTER_PRESETS,
  cisco_ios_switch: CISCO_SWITCH_PRESETS,
  cisco_nxos: [
    { command: "show interface status", label: "Status Port Interface", category: "network" },
    { command: "show bgp ipv4 unicast summary", label: "Status BGP Summary", category: "network" },
    { command: "show bgp sessions", label: "Session Peering BGP", category: "network" },
    { command: "show ip route", label: "Tabel Routing IP", category: "network" },
    { command: "show running-config", label: "Lihat Running Config", category: "network" },
    { command: "show cdp neighbors", label: "Tetangga CDP", category: "network" },
    { command: "show lldp neighbors", label: "Tetangga LLDP", category: "network" },
    { command: "show vpc", label: "Status vPC", category: "network" },
    { command: "write memory", label: "Simpan Konfigurasi (write)", category: "network" },
    { command: "do copy running-config startup-config", label: "Simpan Konfigurasi (do copy run start)", category: "network" },
  ],
  mikrotik: [
    { command: "ip address print", label: "Daftar IP Address", category: "network" },
    { command: "routing bgp session print", label: "Status BGP Sessions (v7)", category: "network" },
    { command: "routing bgp peer print status", label: "Status BGP Peers (v6)", category: "network" },
    { command: "ip route print", label: "Tabel Routing IP", category: "network" },
    { command: "interface print", label: "Daftar Interface", category: "network" },
    { command: "system resource print", label: "Status CPU, RAM & Uptime", category: "system" },
    { command: "log print", label: "Lihat System Log", category: "system" },
    { command: "export", label: "Export Full Config", category: "network" },
    { command: "ping 8.8.8.8 count=4", label: "Tes Koneksi Internet", category: "network" },
    { command: "tool torch interface=ether1", label: "Monitor Traffic Realtime", category: "network" },
  ],
  huawei_vrp: [
    { command: "display ip interface brief", label: "Daftar Interface & IP", category: "network" },
    { command: "display bgp peer", label: "Status BGP Peer Summary", category: "network" },
    { command: "display bgp routing-table", label: "Tabel Routing BGP", category: "network" },
    { command: "display ip routing-table", label: "Tabel Routing IP", category: "network" },
    { command: "display current-configuration", label: "Lihat Current Config", category: "network" },
    { command: "display interface brief", label: "Status Ringkas Interface", category: "network" },
    { command: "display lldp neighbor brief", label: "Tetangga LLDP", category: "network" },
    { command: "display clock", label: "Waktu & Jam Sistem", category: "system" },
    { command: "save", label: "Simpan Konfigurasi", category: "network" },
    { command: "system-view", label: "Masuk System View", category: "network" },
  ],
  juniper_junos: [
    { command: "show interfaces terse", label: "Daftar Interface Ringkas", category: "network" },
    { command: "show bgp summary", label: "Status BGP Peer Summary", category: "network" },
    { command: "show bgp neighbor", label: "Detail BGP Neighbor", category: "network" },
    { command: "show route", label: "Tabel Routing IP", category: "network" },
    { command: "show configuration", label: "Lihat Konfigurasi JunOS", category: "network" },
    { command: "show chassis routing-engine", label: "Status Routing Engine", category: "system" },
    { command: "show log messages", label: "Lihat Log Sistem", category: "system" },
    { command: "configure", label: "Masuk Mode Configuration", category: "network" },
    { command: "commit", label: "Terapkan Konfigurasi", category: "network" },
  ],
  linux: [
    { command: "ip a", label: "Daftar Interface & IP Address", category: "network" },
    { command: "ip route", label: "Tabel Routing IP", category: "network" },
    { command: "htop", label: "Monitor CPU & Process Realtime", category: "system" },
    { command: "systemctl status", label: "Status Service Sistem", category: "system" },
    { command: "journalctl -xe --no-pager", label: "Log Error Sistem Terbaru", category: "system" },
    { command: "df -h", label: "Kapasitas Storage Disk", category: "system" },
    { command: "free -h", label: "Penggunaan Memory RAM", category: "system" },
    { command: "docker ps", label: "Daftar Container Docker", category: "system" },
    { command: "ss -tulpn", label: "Port Listening Aktif", category: "network" },
    { command: "sudo cat /var/log/syslog | tail -n 50", label: "Syslog Terbaru", category: "system" },
  ],
};

/**
 * Mendeteksi vendor/OS dan tipe perangkat (Router vs Switch) dari teks banner atau prompt awal terminal.
 * Mampu mendeteksi nama hostname kustom seperti `sw-mmr#`, `MMR-SW#`, `cisco-switch#`, dll.
 */
export function detectVendorFromOutput(text: string): DeviceVendor | null {
  if (!text || text.length < 2) return null;

  // 1. Linux / Unix (Diuji TERLEBIH DAHULU untuk mencegah false positive pada htop/ps/systemd/bash/zsh)
  if (
    /Ubuntu|Debian|CentOS|Red Hat|Fedora|Alpine|Linux|GNU\/Linux|htop|systemctl|\w+@\w+:[~/#\$]/i.test(
      text
    )
  ) {
    return "linux";
  }

  // 2. Cisco NX-OS
  if (/NX-OS|Nexus/i.test(text)) {
    return "cisco_nxos";
  }

  // 3. Deteksi Spesifik Cisco Switch (Termasuk Switch MMR, Catalyst, SW-*, *-SW, dll)
  if (
    /Cisco/i.test(text) ||
    /Catalyst|C2960|C3560|C3750|C3850|C9200|C9300|C9500|WS-C|User Access Verification/i.test(text) ||
    /\b[A-Za-z0-9_-]*(sw|switch|mmr)[A-Za-z0-9_-]*[\(config\)]*[#>]/i.test(text)
  ) {
    const isSwitchIndicator =
      /sw|switch|mmr|catalyst|c29|c35|c37|c38|c92|c93|c95|vlan|trunk|spanning-tree|mac address/i.test(text) ||
      /\b[A-Za-z0-9_-]*(sw|switch|mmr)[A-Za-z0-9_-]*[\(config\)]*[#>]/i.test(text);

    const isRouterIndicator =
      /\b(router|rtr|isr|asr|c7600|c7200)\b/i.test(text) ||
      /\b[A-Za-z0-9_-]*(router|rtr)[A-Za-z0-9_-]*[\(config\)]*[#>]/i.test(text);

    if (isSwitchIndicator && !isRouterIndicator) {
      return "cisco_ios_switch";
    }
    if (isRouterIndicator) {
      return "cisco_ios_router";
    }

    return "cisco_ios_switch";
  }

  // 4. Prompt Heuristics untuk Switch / Router Tanpa Kata "Cisco"
  if (/\b[A-Za-z0-9_-]*(sw|switch|mmr)[A-Za-z0-9_-]*[\(config\)]*[#>]/i.test(text)) {
    return "cisco_ios_switch";
  }
  if (/\b[A-Za-z0-9_-]*(router|rtr)[A-Za-z0-9_-]*[\(config\)]*[#>]/i.test(text)) {
    return "cisco_ios_router";
  }

  // 5. MikroTik
  if (/MikroTik RouterOS|MikroTik|\[.*@.*\]\s*>/i.test(text)) {
    return "mikrotik";
  }

  // 6. Huawei VRP (Diperketat: Hanya banner resmi Huawei VRP atau prompt CLI <Hostname>/[Hostname] murni, bebas false positive htop)
  const isHuaweiBanner = /VRP\s*\(R\)\s*software|Huawei\s+Versatile\s+Routing|Huawei\s+Technologies|display\s+current-configuration/i.test(text);
  const isHuaweiPrompt = (/(?:^|[\r\n])<[A-Za-z0-9_.-]{2,30}>\s*$/m.test(text) || /(?:^|[\r\n])\[[A-Za-z0-9_./-]{2,30}\]\s*$/m.test(text)) &&
    !/\[[\|#\-\=\s]+\]/.test(text) && // Mencegah match pada progress bar htop [|||||]
    !/Linux|Ubuntu|Debian|CentOS|htop|systemd|wineserver|snap/i.test(text);

  if (isHuaweiBanner || isHuaweiPrompt) {
    return "huawei_vrp";
  }

  // 7. Juniper JunOS
  if (/JUNOS|JUNIPER|user@.*>/i.test(text)) {
    return "juniper_junos";
  }

  // Fallback prompt umum Cisco CLI `#` atau `>`
  if (/[\(config\)]*[#>]\s*$/m.test(text)) {
    if (/sw|switch|mmr/i.test(text)) return "cisco_ios_switch";
    return "cisco_ios_switch";
  }

  return null;
}
