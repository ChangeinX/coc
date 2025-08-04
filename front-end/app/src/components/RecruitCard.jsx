import React from 'react';

export default function RecruitCard({ callToAction, age, onJoin }) {
  return (
    <button
      type="button"
      aria-label="Join clan"
      onClick={onJoin}
      className="w-full text-left p-3 border-b flex gap-3 bg-white"
    >
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{age}</span>
        </div>
        <p className="text-sm line-clamp-2 mt-1 text-slate-700">{callToAction}</p>
      </div>
    </button>
  );
}
