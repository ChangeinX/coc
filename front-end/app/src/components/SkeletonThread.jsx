import React from 'react';

export default function SkeletonThread() {
  return (
    <li className="thread animate-pulse">
      <div className="avatar bg-slate-300 rounded-full" />
      <div className="meta flex-1">
        <div className="h-4 bg-slate-300 rounded w-1/2 mb-1" />
        <div className="h-3 bg-slate-200 rounded w-3/4" />
      </div>
      <div className="time h-3 bg-slate-200 rounded w-8" />
    </li>
  );
}
