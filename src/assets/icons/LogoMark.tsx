const WEDGES = [
  { points: "12,12 12,2 20.66,7", fill: "#51545e" },
  { points: "12,12 20.66,7 20.66,17", fill: "#2563eb" },
  { points: "12,12 20.66,17 12,22", fill: "#059669" },
  { points: "12,12 12,22 3.34,17", fill: "#d97706" },
  { points: "12,12 3.34,17 3.34,7", fill: "#9333ea" },
  { points: "12,12 3.34,7 12,2", fill: "#e11d48" },
];

interface LogoMarkProps {
  size?: number;
  animated?: boolean;
}

export function LogoMark({ size = 32, animated = false }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {WEDGES.map((wedge, index) => (
        <polygon
          key={wedge.fill}
          points={wedge.points}
          fill={wedge.fill}
          className={animated ? "animate-logo-wedge" : undefined}
          style={
            animated
              ? { animationDelay: `${(index * 1.8) / WEDGES.length}s` }
              : undefined
          }
        />
      ))}
    </svg>
  );
}
