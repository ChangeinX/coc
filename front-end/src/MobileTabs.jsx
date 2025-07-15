import React from 'react';

export default function MobileTabs({ tabs, active, onChange }) {
  return (
    <div className="flex justify-center gap-2 mb-4">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={
            'px-3 py-1 rounded-full text-sm ' +
            (active === t.value
              ? 'bg-slate-800 text-white'
              : 'bg-slate-200 text-slate-700')
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
