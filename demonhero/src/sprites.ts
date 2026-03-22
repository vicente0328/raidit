export const createSvgIcon = (svgString: string) => {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  return img;
};

export const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32">
  <path d="M4 10 L0 30 L8 28 Z" fill="#b91c1c"/>
  <rect x="6" y="12" width="12" height="12" rx="2" fill="#94a3b8"/>
  <rect x="6" y="4" width="12" height="10" rx="3" fill="#cbd5e1"/>
  <rect x="8" y="7" width="8" height="3" fill="#0f172a"/>
  <rect x="10" y="7" width="4" height="3" fill="#38bdf8"/>
  <rect x="18" y="14" width="6" height="2" fill="#475569"/>
  <path d="M20 4 L22 4 L22 16 L20 16 Z" fill="#f8fafc"/>
  <rect x="8" y="24" width="3" height="6" fill="#475569"/>
  <rect x="13" y="24" width="3" height="6" fill="#475569"/>
</svg>`;

export const patrolSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path d="M16 18 Q 4 6 2 14 Q 8 22 16 18" fill="#7e22ce"/>
  <path d="M16 18 Q 28 6 30 14 Q 24 22 16 18" fill="#7e22ce"/>
  <circle cx="16" cy="16" r="6" fill="#a855f7"/>
  <circle cx="14" cy="15" r="1.5" fill="#facc15"/>
  <circle cx="18" cy="15" r="1.5" fill="#facc15"/>
</svg>`;

export const stationarySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path d="M4 28 C 4 12, 28 12, 28 28 Z" fill="#d946ef"/>
  <circle cx="16" cy="22" r="5" fill="#fdf4ff" opacity="0.6"/>
  <circle cx="12" cy="20" r="2" fill="#4a044e"/>
  <circle cx="20" cy="20" r="2" fill="#4a044e"/>
</svg>`;

export const bossSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <path d="M16 28 Q 6 8 4 14 Q 12 24 16 28" fill="#991b1b"/>
  <path d="M48 28 Q 58 8 60 14 Q 52 24 48 28" fill="#991b1b"/>
  <path d="M12 28 L52 28 L44 56 L20 56 Z" fill="#27272a"/>
  <path d="M24 48 L40 48 L36 56 L28 56 Z" fill="#09090b"/>
  <path d="M20 36 L28 40 L20 44 Z" fill="#ef4444"/>
  <path d="M44 36 L36 40 L44 44 Z" fill="#ef4444"/>
  <polygon points="32,16 38,28 26,28" fill="#eab308"/>
</svg>`;

export const wallSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" fill="#18181b"/>
  <rect x="1" y="1" width="38" height="18" fill="#27272a" stroke="#3f3f46" stroke-width="1"/>
  <rect x="1" y="21" width="18" height="18" fill="#27272a" stroke="#3f3f46" stroke-width="1"/>
  <rect x="21" y="21" width="18" height="18" fill="#27272a" stroke="#3f3f46" stroke-width="1"/>
</svg>`;

export const spikeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20">
  <path d="M0 20 L10 0 L20 20 Z" fill="#71717a"/>
  <path d="M10 20 L10 0 L20 20 Z" fill="#52525b"/>
  <path d="M20 20 L30 0 L40 20 Z" fill="#71717a"/>
  <path d="M30 20 L30 0 L40 20 Z" fill="#52525b"/>
  <path d="M10 0 L13 8 L7 6 Z" fill="#991b1b"/>
  <path d="M30 0 L33 8 L27 6 Z" fill="#991b1b"/>
</svg>`;

export const doorSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" fill="#451a03"/>
  <rect x="4" y="4" width="32" height="36" fill="#78350f"/>
  <rect x="4" y="8" width="32" height="4" fill="#0f172a"/>
  <rect x="4" y="24" width="32" height="4" fill="#0f172a"/>
  <circle cx="20" cy="20" r="4" fill="#fef08a"/>
  <polygon points="18,20 22,20 24,28 16,28" fill="#fef08a"/>
</svg>`;

export const SPRITES = {
  hero: createSvgIcon(heroSvg),
  patrol: createSvgIcon(patrolSvg),
  stationary: createSvgIcon(stationarySvg),
  boss: createSvgIcon(bossSvg),
  wall: createSvgIcon(wallSvg),
  spike: createSvgIcon(spikeSvg),
  door: createSvgIcon(doorSvg),
};
