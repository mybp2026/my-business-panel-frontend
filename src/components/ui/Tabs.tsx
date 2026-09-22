interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeId, onChange }: TabsProps) {
  return (
    <div
      role="tablist"
      className="flex flex-wrap gap-1 rounded-2xl border border-gray-300 bg-white p-1"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={[
              "focus-ring-accent cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors outline-none",
              isActive
                ? "bg-(--accent-950) text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
