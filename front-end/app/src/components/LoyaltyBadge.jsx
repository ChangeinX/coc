import React from 'react';
import { formatDays } from '../lib/time.js';

export default function LoyaltyBadge({ days, size = 60 }) {
  const label = formatDays(days);
  return (
    <div
      className="flex items-center justify-center rounded-full bg-white text-slate-800 font-semibold"
      style={{ width: size, height: size }}
    >
      {label}
    </div>
  );
}
