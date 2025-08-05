import React from 'react';

export default function PlayerRecruitCard({
  id,
  avatar,
  name,
  tag,
  age,
  description,
  onInvite,
}) {
  return (
    <button
      type="button"
      aria-label={`Invite ${name}`}
      onClick={onInvite}
      className="w-full text-left p-3 border rounded-md flex gap-3 bg-white shadow-sm"
    >
      {avatar && <img src={avatar} alt="avatar" className="w-12 h-12 rounded" />}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{name}</h3>
          <span className="text-xs text-slate-500">{age}</span>
        </div>
        {tag && <p className="text-xs text-slate-500">{tag}</p>}
        <p className="text-sm mt-1 text-slate-700 whitespace-pre-wrap">{description}</p>
      </div>
    </button>
  );
}
