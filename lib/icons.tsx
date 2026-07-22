const ICON_PATHS: Record<string, string> = {
  "alert-triangle": '<path d="M12 9v4"/><path d="M10.36 3.94l-8.46 14.66a1.42 1.42 0 0 0 1.23 2.13h16.92a1.42 1.42 0 0 0 1.23-2.13l-8.46-14.66a1.42 1.42 0 0 0-2.46 0z"/><path d="M12 16h.01"/>',
  "arrow-right": '<path d="M5 12h14"/><path d="M13 6l6 6l-6 6"/>',
  bolt: '<path d="M13 3l-9 11h6l-1 7l9-11h-6l1-7z"/>',
  "brand-tiktok": '<path d="M9 12a4 4 0 1 0 4 4v-13a5 5 0 0 0 5 5"/>',
  "brand-youtube": '<path d="M2 8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-12a4 4 0 0 1-4-4v-8z"/><path d="M10 9l5 3l-5 3z"/>',
  check: '<path d="M5 12l5 5l10-10"/>',
  "chevron-left": '<path d="M15 6l-6 6l6 6"/>',
  "chevron-right": '<path d="M9 6l6 6l-6 6"/>',
  "circle-check": '<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2l4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  "trending-up": '<path d="M3 17l6-6l4 4l8-8"/><path d="M21 5v6h-6"/>',
  "layout-grid": '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 14h16"/><path d="M12 4v16"/>',
  "cloud-upload": '<path d="M7 18a4 4 0 0 1-1-7.87a5 5 0 0 1 9.5-2.13a4.5 4.5 0 0 1 2.5 8.5"/><path d="M12 12v8"/><path d="M9 15l3-3l3 3"/>',
  crown: '<path d="M3 9l4 3l5-6l5 6l4-3l-1.5 10h-15z"/>',
  download: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M7 11l5 5l5-5"/><path d="M12 4v12"/>',
  edit: '<path d="M4 20l4-1l10-10l-3-3l-10 10z"/><path d="M13 6l3 3"/>',
  eye: '<path d="M2 12s3.5-7 10-7s10 7 10 7s-3.5 7-10 7s-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="M3 3l18 18"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61C3.35 8.36 2 11 2 11s3.5 7 10 7a9.53 9.53 0 0 0 5-1.5"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>',
  "file-music": '<path d="M6 3h8l4 4v13a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z"/><path d="M10 17a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/><path d="M12 13v-4l3-1v4"/>',
  "file-text": '<path d="M6 3h8l4 4v13a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z"/><path d="M9 13h6"/><path d="M9 17h6"/>',
  headphones: '<path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5a2 2 0 0 0 2 2h1v-6h-3z"/><path d="M20 13v5a2 2 0 0 1-2 2h-1v-6h3z"/>',
  infinity: '<path d="M6.5 15.5a3.5 3.5 0 1 1 0-7c3 0 5.5 7 8.5 7a3.5 3.5 0 1 0 0-7c-3 0-5.5 7-8.5 7z"/>',
  library: '<path d="M4 19V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v15"/><path d="M4 19h6"/><path d="M14 19l3-15l4 1l-3 15z"/>',
  link: '<path d="M9 15l6-6"/><path d="M11 6l1-1a3.5 3.5 0 0 1 5 5l-1 1"/><path d="M13 18l-1 1a3.5 3.5 0 0 1-5-5l1-1"/>',
  "loader-2": '<path d="M12 3a9 9 0 1 0 9 9"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11v-4a4 4 0 0 1 8 0v4"/>',
  logout: '<path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2"/><path d="M7 12h14"/><path d="M18 15l3 -3l-3 -3"/>',
  microphone: '<path d="M9 4a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
  "microphone-2": '<path d="M9 4a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
  minus: '<path d="M5 12h14"/>',
  movie: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14"/><path d="M17 5v14"/>',
  pencil: '<path d="M4 20l4-1l10-10l-3-3l-10 10z"/><path d="M13 6l3 3"/>',
  photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M4 18l5-5l3 3l4-4l4 4"/>',
  "player-pause": '<rect x="7" y="5" width="3" height="14" rx="1"/><rect x="14" y="5" width="3" height="14" rx="1"/>',
  "player-play": '<path d="M7 4v16l14-8z"/>',
  "player-stop-filled": '<rect x="5" y="5" width="14" height="14" rx="1"/>',
  plug: '<path d="M7 11V7"/><path d="M11 11V7"/><path d="M6 11h6a2 2 0 0 1 2 2a5 5 0 0 1-5 5"/><path d="M9 18v3"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  repeat: '<path d="M4 12v-2a4 4 0 0 1 4-4h12l-3-3"/><path d="M20 12v2a4 4 0 0 1-4 4h-12l3 3"/>',
  rocket: '<path d="M5 19l1.5-4.5L12 9l4.5 4.5L11 15z"/><path d="M12 9a5 5 0 0 1 5-5c1 3 0 6-2 8"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4"/><path d="M8.2 13.2l7.6 4.4"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/>',
  "brand-whatsapp": '<path d="M4 20l1.4-4.2A8 8 0 1 1 9 19.5z"/><path d="M9 9c0 3 3 6 6 6c.5 0 1-.5 1-1.2c0-.3-.2-.5-.5-.7l-1.6-.9c-.3-.2-.6-.1-.8.1l-.5.6c-1-.6-1.9-1.5-2.5-2.5l.6-.5c.2-.2.3-.5.1-.8l-.9-1.6c-.2-.3-.4-.5-.7-.5C9.5 7 9 7.5 9 8z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.8 1c0 1.5-2.3 1.8-2.3 3.5"/><path d="M12 17h.01"/>',
  "message-bot": '<rect x="4" y="5" width="16" height="11" rx="3"/><path d="M8 21l4-4l4 4"/><path d="M9 10h.01"/><path d="M15 10h.01"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M10.5 12.5L20 3"/><path d="M17 6l3 3"/><path d="M14 9l3 3"/>',
  sparkles: '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 17l.7 2.1l2.1.7l-2.1.7l-.7 2.1l-.7-2.1l-2.1-.7l2.1-.7z"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
  typography: '<path d="M4 20h4"/><path d="M14 20h6"/><path d="M6.9 15h6.2"/><path d="M9.5 5h2l4 15h-2l-1.1-4h-6.8l-1.1 4h-2z"/>',
  "zoom-in": '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/><path d="M7 10h6"/><path d="M10 7v6"/>',
};

export type IconName = keyof typeof ICON_PATHS;

export function Icon({
  name,
  className,
  spin,
}: {
  name: IconName | string;
  className?: string;
  spin?: boolean;
}) {
  const path = ICON_PATHS[name];
  if (!path) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`inline-block align-[-0.125em] ${spin ? "animate-spin" : ""} ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}
