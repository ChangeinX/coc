import React from 'react';

export default function RecruitSkeleton() {
  return (
    <div className="animate-pulse h-[112px] flex items-center gap-3 p-3">
      <div className="w-12 h-12 bg-slate-300 rounded" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-300 rounded w-1/2" />
        <div className="h-3 bg-slate-200 rounded w-3/4" />
        <div className="h-2 bg-slate-200 rounded" />
        <div className="h-3 bg-slate-200 rounded w-5/6" />
      </div>
    </div>
  );
}
