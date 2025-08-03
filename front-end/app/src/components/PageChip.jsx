import React from 'react';
import { Link } from 'react-router-dom';

export default function PageChip({ page }) {
  return (
    <div className="flex justify-center my-2">
      <Link
        to={`?page=${page}`}
        className="px-3 py-1 text-sm bg-slate-200 rounded-full"
      >
        Page {page}
      </Link>
    </div>
  );
}
