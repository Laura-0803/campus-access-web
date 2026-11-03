export const catAvatarPalettes = [
  { id: "orange", label: "橘子", fur: "#F59E0B", furDark: "#B45309", bg: "#FFF7ED", accent: "#FED7AA" },
  { id: "silver", label: "银灰", fur: "#94A3B8", furDark: "#475569", bg: "#F8FAFC", accent: "#E2E8F0" },
  { id: "blue", label: "晴蓝", fur: "#60A5FA", furDark: "#1D4ED8", bg: "#EFF6FF", accent: "#BFDBFE" },
  { id: "rose", label: "樱粉", fur: "#FB7185", furDark: "#BE123C", bg: "#FFF1F2", accent: "#FECDD3" },
  { id: "mint", label: "薄荷", fur: "#34D399", furDark: "#047857", bg: "#ECFDF5", accent: "#A7F3D0" },
  { id: "violet", label: "葡萄", fur: "#A78BFA", furDark: "#6D28D9", bg: "#F5F3FF", accent: "#DDD6FE" }
];

function hash(value) {
  return [...String(value || "campus")].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7);
}

export function defaultCatPalette(account) {
  return catAvatarPalettes[hash(account) % catAvatarPalettes.length].id;
}

export function pixelCatAvatar(paletteId = "orange") {
  const palette = catAvatarPalettes.find((item) => item.id === paletteId) || catAvatarPalettes[0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">
    <rect width="64" height="64" rx="14" fill="${palette.bg}"/>
    <rect x="8" y="8" width="48" height="48" rx="12" fill="${palette.accent}"/>
    <path fill="${palette.furDark}" d="M16 25V13h8v6h16v-6h8v12h4v27H12V25z"/>
    <path fill="${palette.fur}" d="M18 27V17h5v7h18v-7h5v10h4v23H14V27z"/>
    <rect x="20" y="31" width="6" height="7" fill="#172033"/>
    <rect x="38" y="31" width="6" height="7" fill="#172033"/>
    <rect x="22" y="31" width="2" height="2" fill="#fff"/>
    <rect x="40" y="31" width="2" height="2" fill="#fff"/>
    <rect x="29" y="39" width="6" height="4" fill="#F8FAFC"/>
    <rect x="31" y="41" width="2" height="3" fill="#172033"/>
    <rect x="24" y="45" width="7" height="2" fill="#fff" opacity=".82"/>
    <rect x="33" y="45" width="7" height="2" fill="#fff" opacity=".82"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function storageKey(session) {
  return `campus_avatar_${session?.user?.id || session?.user?.username || "guest"}`;
}

export function readAvatarPreference(session) {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(session)) || "null");
    if (value?.type === "upload" && value.dataUrl) return value;
    if (value?.type === "pixel" && value.palette) return value;
  } catch {
    // Invalid browser data falls back to the deterministic local avatar.
  }
  return { type: "pixel", palette: defaultCatPalette(session?.user?.username) };
}

export function avatarUrlFromPreference(preference) {
  return preference?.type === "upload" ? preference.dataUrl : pixelCatAvatar(preference?.palette);
}

export function hydrateSessionAvatar(session) {
  if (!session?.user) return session;
  const preference = readAvatarPreference(session);
  return {
    ...session,
    profile: { ...(session.profile || {}), avatar: avatarUrlFromPreference(preference) }
  };
}

export function saveAvatarPreference(session, preference) {
  localStorage.setItem(storageKey(session), JSON.stringify(preference));
  return {
    ...session,
    profile: { ...(session.profile || {}), avatar: avatarUrlFromPreference(preference) }
  };
}
