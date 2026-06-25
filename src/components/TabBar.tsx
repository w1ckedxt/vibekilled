"use client";

export interface Tab<T extends string> {
  key: T;
  label: string;
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab<T>[];
  active: T;
  onChange: (k: T) => void;
}) {
  return (
    <div className="glass pointer-events-auto flex gap-1 rounded-full p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold transition ${
            active === t.key ? "bg-white/15 text-white" : "text-white/45 hover:text-white/75"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
