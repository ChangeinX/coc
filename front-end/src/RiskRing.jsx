import React from 'react';
import { getRiskClasses } from './RiskBadge.jsx';

export default function RiskRing({ score, size = 60 }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circumference - (pct / 100) * circumference;
  const [bg, text] = getRiskClasses(score).split(' ');
  const color = bg.replace('bg-', 'stroke-');

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
        {score}
      </text>
    </svg>
  );
}
