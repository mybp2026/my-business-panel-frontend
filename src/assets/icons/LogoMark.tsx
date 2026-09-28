export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points="12,12 12,2 20.66,7" fill="#51545e" />
      <polygon points="12,12 20.66,7 20.66,17" fill="#2563eb" />
      <polygon points="12,12 20.66,17 12,22" fill="#059669" />
      <polygon points="12,12 12,22 3.34,17" fill="#d97706" />
      <polygon points="12,12 3.34,17 3.34,7" fill="#9333ea" />
      <polygon points="12,12 3.34,7 12,2" fill="#e11d48" />
    </svg>
  );
}
