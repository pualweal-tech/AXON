import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function S({ size = 22, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconChat({ size = 22, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-4.2 3.2A.8.8 0 0 1 4.5 18.6V6.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="9" cy="10.5" r="1" fill={filled ? "#15151F" : "currentColor"} />
      <circle cx="12" cy="10.5" r="1" fill={filled ? "#15151F" : "currentColor"} />
      <circle cx="15" cy="10.5" r="1" fill={filled ? "#15151F" : "currentColor"} />
    </svg>
  );
}

export function IconBolt({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFD60A">
      <path d="M13.2 3 6.4 13.1h4.3L9.6 21l8.4-11.4h-4.6L13.2 3Z" />
    </svg>
  );
}

export function IconFolder({ size = 22 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="M3.5 8.5V7A2 2 0 0 1 5.5 5h3.2l1.6 2H18.5A2 2 0 0 1 20.5 9v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-8.5Z" />
    </S>
  );
}

export function IconPerson({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#4C8DFF">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 18.5c1.2-3.1 3.5-4.6 6.5-4.6s5.3 1.5 6.5 4.6" />
    </svg>
  );
}

export function IconSpark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3.2 13.7 9 19.5 10.8 13.7 12.6 12 18.4 10.3 12.6 4.5 10.8 10.3 9 12 3.2Z" />
    </svg>
  );
}

export function IconPlus({ size = 18 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="M12 5v14M5 12h14" />
    </S>
  );
}

export function IconMic({ size = 18 }: { size?: number }) {
  return (
    <S size={size}>
      <rect x="9" y="4" width="6" height="10" rx="3" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3" />
    </S>
  );
}

export function IconSend({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 19V5M6.5 11 12 5l5.5 6" />
    </svg>
  );
}

export function IconDots({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}

export function IconSearch({ size = 18 }: { size?: number }) {
  return (
    <S size={size}>
      <circle cx="11" cy="11" r="6" />
      <path d="m16.5 16.5 3 3" />
    </S>
  );
}

export function IconBack({ size = 18 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="M15 5 8 12l7 7" />
    </S>
  );
}

export function IconRegen({ size = 18 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="M20 12a8 8 0 1 1-2.2-5.5" />
      <path d="M20 4.5V9h-4.5" />
    </S>
  );
}

export function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <S size={size} strokeWidth={2.4}>
      <path d="m5 12 4.2 4.2L19 7.5" />
    </S>
  );
}

export function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="M5 7h14M10 7V5h4v2M8 7l.8 12h6.4L16 7" />
    </S>
  );
}

export function IconLink({ size = 18 }: { size?: number }) {
  return (
    <S size={size} color="#3D6FD9">
      <path d="M9.5 14.5 7.2 16.8a3 3 0 0 1-4.2-4.2l3.4-3.4a3 3 0 0 1 4.2 0" />
      <path d="M14.5 9.5 16.8 7.2a3 3 0 0 1 4.2 4.2l-3.4 3.4a3 3 0 1 1-4.2 0" />
    </S>
  );
}

export function IconPlane({ size = 18 }: { size?: number }) {
  return (
    <S size={size} color="#4C8DFF">
      <path d="M3 12.5 21 4.5 14.5 21l-2.3-6.5L3 12.5Z" />
    </S>
  );
}

export function IconChart({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="4" y="13" width="4" height="7" rx="1" fill="#C95C61" />
      <rect x="10" y="8" width="4" height="12" rx="1" fill="#4E9B72" />
      <rect x="16" y="5" width="4" height="15" rx="1" fill="#3D6FD9" />
    </svg>
  );
}

export function IconClipboard({ size = 18 }: { size?: number }) {
  return (
    <S size={size}>
      <rect x="6" y="5" width="12" height="15" rx="2" />
      <path d="M9 5.5h6v2H9z" />
    </S>
  );
}

export function IconPen({ size = 18 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    </S>
  );
}

export function IconCheckBox({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="5" fill="#3D8F68" />
      <path d="m8 12 2.8 2.8L16.5 9" stroke="#fff" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function IconNote({ size = 16 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="M7 4h8l4 4v12H7V4Z" />
      <path d="M15 4v4h4M9 12h6M9 16h4" />
    </S>
  );
}

export function IconCal({ size = 18, day }: { size?: number; day?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="3.5" y="5" width="17" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke="currentColor" strokeWidth="1.6" />
      <text x="12" y="18.2" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor">
        {day ?? 17}
      </text>
    </svg>
  );
}

export function IconChevron({ size = 16 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="m9 6 6 6-6 6" />
    </S>
  );
}

export function IconGoogle({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6c-.2 1.2-.9 2.2-2 2.9v2.4h3.2C20.7 17.6 22 15.1 22 12.2Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-0.9 6.6-2.4l-3.2-2.4c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.5C4.8 19.8 8.1 22 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.6H3.1A9.9 9.9 0 0 0 2 12c0 1.6.4 3.1 1.1 4.4l3.3-2.5Z" />
      <path fill="#EA4335" d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.8 4.2 3.1 7.6l3.3 2.5C7.2 7.5 9.4 5.8 12 5.8Z" />
    </svg>
  );
}

export function AxonMark({ size = 40 }: { size?: number }) {
  const id = "axonRing" + size;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2E5BFF" />
          <stop offset="100%" stopColor="#7E3FF2" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="#0F1117" />
      <circle cx="24" cy="24" r="11.5" fill="none" stroke={`url(#${id})`} strokeWidth="5" />
      <circle cx="24" cy="24" r="6" fill="#fff" />
    </svg>
  );
}
