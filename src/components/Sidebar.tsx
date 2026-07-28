import { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Folder, FolderOpen, Download, Upload } from "lucide-react";
import type { Profile, Protocol } from "../lib/types";
import { listProfiles, deleteProfile, exportProfilesToFile, importProfilesFromFile } from "../lib/ipc";
import { useTranslation } from "../lib/i18n";

const badgeLabel: Record<Protocol, string> = { ssh: "SSH", telnet: "TEL", serial: "SER", ftp: "FTP", local: "LOC" };

/** Baris sekunder di item profil: user@host, atau port serial untuk protokol serial. */
function hostLabel(p: Profile): string {
  if (p.protocol === "serial") return p.serial_port || "serial";
  return `${p.username ? `${p.username}@` : ""}${p.host}`;
}

interface SidebarProps {
  onConnectProfile: (profile: Profile) => void;
  onAddProfile: () => void;
  onEditProfile: (profile: Profile) => void;
  refreshTrigger: number;
  collapsed?: boolean;
}

export function Sidebar({
  onConnectProfile,
  onAddProfile,
  onEditProfile,
  refreshTrigger,
  collapsed = false,
}: SidebarProps) {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    listProfiles()
      .then((data) => {
        setProfiles(data);
        // Default: buka semua folder yang ada profilnya
        const groups: Record<string, boolean> = {};
        data.forEach((p) => {
          if (p.group_path) {
            groups[p.group_path] = true;
          }
        });
        setExpandedGroups((prev) => ({ ...groups, ...prev }));
      })
      .catch((err) => console.error("Gagal mengambil profil:", err));
  }, [refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Apakah Anda yakin ingin menghapus profil ini?")) {
      try {
        await deleteProfile(id);
        setProfiles((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        alert("Gagal menghapus profil: " + err);
      }
    }
  };

  const handleExport = async () => {
    try {
      const saved = await exportProfilesToFile();
      if (saved) alert(`Profil berhasil diekspor ke:\n${saved}`);
    } catch (err) {
      alert("Gagal ekspor profil: " + err);
    }
  };

  const handleImport = async () => {
    try {
      const count = await importProfilesFromFile();
      if (count !== null) {
        alert(`Berhasil mengimpor ${count} profil!`);
        listProfiles().then(setProfiles);
      }
    } catch (err) {
      alert("Gagal impor profil: " + err);
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Filter profil berdasarkan kata kunci pencarian
  const filteredProfiles = profiles.filter((p) => {
    const matchName = p.name.toLowerCase().includes(search.toLowerCase());
    const matchHost = p.host.toLowerCase().includes(search.toLowerCase());
    const matchGroup = p.group_path.toLowerCase().includes(search.toLowerCase());
    return matchName || matchHost || matchGroup;
  });

  // Pengelompokan profil
  const groups: Record<string, Profile[]> = {};
  const ungrouped: Profile[] = [];

  filteredProfiles.forEach((p) => {
    if (p.group_path) {
      if (!groups[p.group_path]) {
        groups[p.group_path] = [];
      }
      groups[p.group_path].push(p);
    } else {
      ungrouped.push(p);
    }
  });

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <h3>{t.savedAccess}</h3>
        <div style={{ display: "flex", gap: "4px" }}>
          <button className="add-profile-btn" onClick={handleExport} title={t.exportProfilesTooltip}>
            <Download size={14} />
          </button>
          <button className="add-profile-btn" onClick={handleImport} title={t.importProfilesTooltip}>
            <Upload size={14} />
          </button>
          <button className="add-profile-btn" onClick={onAddProfile} title={t.addProfileTooltip}>
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="sidebar-search">
        <Search size={14} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchProfilePlaceholder}
        />
      </div>

      <div className="sidebar-list">
        {/* Render groups */}
        {Object.entries(groups).map(([groupName, groupProfiles]) => {
          const isExpanded = expandedGroups[groupName] !== false;
          return (
            <div key={groupName} className="profile-group">
              <div className="group-title" onClick={() => toggleGroup(groupName)}>
                <span className="folder-icon">
                  {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
                </span>
                <span className="group-name">{groupName}</span>
                <span className="group-count">({groupProfiles.length})</span>
              </div>

              {isExpanded && (
                <div className="group-items">
                  {groupProfiles.map((p) => (
                    <ProfileItem
                      key={p.id}
                      profile={p}
                      onConnect={onConnectProfile}
                      onEdit={onEditProfile}
                      onDelete={(e) => handleDelete(e, p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Render ungrouped */}
        {ungrouped.length > 0 && (
          <div className="profile-group">
            {Object.keys(groups).length > 0 && (
              <div className="group-title-divider">Lainnya</div>
            )}
            <div className="group-items no-padding">
              {ungrouped.map((p) => (
                <ProfileItem
                  key={p.id}
                  profile={p}
                  onConnect={onConnectProfile}
                  onEdit={onEditProfile}
                  onDelete={(e) => handleDelete(e, p.id)}
                />
              ))}
            </div>
          </div>
        )}

        {profiles.length === 0 && (
          <div className="sidebar-empty">Belum ada profil tersimpan. Klik + untuk membuat.</div>
        )}
      </div>
    </aside>
  );
}

function ProfileItem({
  profile,
  onConnect,
  onEdit,
  onDelete,
}: {
  profile: Profile;
  onConnect: (p: Profile) => void;
  onEdit: (p: Profile) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="profile-item" onClick={() => onConnect(profile)}>
      <span className={`tab-badge badge-${profile.protocol}`}>
        {badgeLabel[profile.protocol]}
      </span>
      <div className="profile-info">
        <span className="profile-name" title={profile.name}>
          {profile.name}
        </span>
        <span className="profile-host" title={hostLabel(profile)}>
          {hostLabel(profile)}
        </span>
      </div>
      <div className="profile-actions">
        <button
          className="action-btn edit"
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(profile);
          }}
        >
          <Pencil size={13} />
        </button>
        <button className="action-btn delete" title="Hapus" onClick={onDelete}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
