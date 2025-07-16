import React from 'react';
import { shortTimeAgo } from '../lib/time.js';

export default function PresenceDot({ lastSeen, size = 16 }) {
  let color = 'bg-gray-400';
  let label = '';
  if (lastSeen) {
    const diffDays = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 86400000);
    if (diffDays >= 4) {
      color = 'bg-red-600';
    } else if (diffDays >= 2) {
      color = 'bg-yellow-400';
    } else {
      color = 'bg-green-600';
    }
    label = shortTimeAgo(lastSeen);
  }

  const showLabel = size >= 24 && label;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${color} ${showLabel ? 'text-white font-semibold text-xs' : ''}`}
      style={{ width: size, height: size }}
    >
      {showLabel ? label : null}
    </span>
  );
}
