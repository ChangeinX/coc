import React from 'react';

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b text-sm sticky top-0 bg-white z-10">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={
            'flex-1 py-2' +
            (active === t.value
              ? ' border-b-2 border-blue-600 text-blue-600 font-medium'
              : ' text-slate-600')
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
