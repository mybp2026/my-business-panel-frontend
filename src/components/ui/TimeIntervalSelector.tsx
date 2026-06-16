export type TimeInterval =
  | "24h"
  | "7d"
  | "15d"
  | "30d"
  | "90d"
  | "180d"
  | "365d";

const INTERVAL_LABELS: Record<TimeInterval, string> = {
  "24h": "24h",
  "7d": "7d",
  "15d": "15d",
  "30d": "30d",
  "90d": "3m",
  "180d": "6m",
  "365d": "1a",
};

const INTERVAL_DAYS: Record<TimeInterval, number> = {
  "24h": 1,
  "7d": 7,
  "15d": 15,
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
};

export function intervalToDates(interval: TimeInterval): {
  start: string;
  end: string;
} {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - INTERVAL_DAYS[interval]);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

interface Props {
  value: TimeInterval;
  onChange: (interval: TimeInterval) => void;
}

export function TimeIntervalSelector({ value, onChange }: Props) {
  const intervals: TimeInterval[] = [
    "24h",
    "7d",
    "15d",
    "30d",
    "90d",
    "180d",
    "365d",
  ];

  return (
    <div className="flex gap-1 flex-wrap">
      {intervals.map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={
            i === value
              ? "px-3 py-1 text-sm rounded-full bg-red-600 text-white font-semibold"
              : "px-3 py-1 text-sm rounded-full bg-white border border-gray-300 text-gray-700 hover:border-red-400 transition-colors"
          }
        >
          {INTERVAL_LABELS[i]}
        </button>
      ))}
    </div>
  );
}
