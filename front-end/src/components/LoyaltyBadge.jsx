import React from 'react';

function formatDuration(days) {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return `${years}y`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months}m`;
  }
  if (days >= 7) {
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  }
  return `${days}d`;
}

export default function LoyaltyBadge({ days, size = 60 }) {
  const label = formatDuration(days);
  return (
    <div
      className="flex items-center justify-center rounded-full bg-white text-slate-800 font-semibold"
      style={{ width: size, height: size }}
    >
      {label}
    </div>
  );
}
