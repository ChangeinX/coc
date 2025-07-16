import React from 'react';

export default function PresenceDot({ lastSeen, size = 16 }) {
  let color = 'bg-gray-400';
  if (lastSeen) {
    const diffDays = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 86400000);
    if (diffDays >= 4) {
      color = 'bg-red-600';
    } else if (diffDays >= 2) {
      color = 'bg-yellow-400';
    } else {
      color = 'bg-green-600';
    }
  }
  return (
    <span
      className={`inline-block rounded-full ${color}`}
      style={{ width: size, height: size }}
    />
  );
}
