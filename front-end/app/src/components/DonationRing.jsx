import React from 'react';

export default function DonationRing({ donations, received, size = 60 }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = donations / Math.max(received, 1);
  const pct = Math.min(1, Math.max(0, ratio));
  const offset = circumference - pct * circumference;

  let color = 'stroke-red-600';
  if (ratio >= 1) {
    color = 'stroke-green-600';
  } else if (ratio >= 0.5) {
    color = 'stroke-yellow-400';
  }

  const display = `${received}/${donations}`;

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#e5e7eb"
        strokeWidth="6"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={color}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="text-xs font-semibold"
      >
        {display}
      </text>
    </svg>
  );
}
