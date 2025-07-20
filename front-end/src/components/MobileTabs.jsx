import React from 'react';

export default function MobileTabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b mb-4">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={
            'flex-1 px-4 py-2 text-sm border-b-2 ' +
            (active === t.value
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600')
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
