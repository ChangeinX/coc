import React from 'react';

export default function RecruitCard({
  id,
  badge,
  name,
  tags = [],
  openSlots,
  totalSlots,
  age,
  description,
  onJoin,
}) {
  const pct = totalSlots ? (openSlots / totalSlots) * 100 : 0;
  return (
    <button
      type="button"
      aria-label={`Join ${name}`}
      onClick={onJoin}
      className="w-full text-left p-3 border-b flex gap-3 bg-white"
    >
      <img src={badge} alt="badge" className="w-12 h-12" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{name}</h3>
          <span className="text-xs text-slate-500">{age}</span>
        </div>
        <div className="flex flex-wrap gap-1 my-1">
          {tags.map((t) => (
            <span
              key={t}
              className="text-xs bg-slate-200 rounded px-1 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="h-2 bg-slate-200 rounded">
          <div
            className="h-full bg-green-500 rounded"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm line-clamp-2 mt-1 text-slate-700">{description}</p>
      </div>
    </button>
  );
}
