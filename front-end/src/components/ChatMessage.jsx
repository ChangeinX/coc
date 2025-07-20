import React from 'react';
import CachedImage from './CachedImage.jsx';

export default function ChatMessage({ message, info, isSelf }) {
  const { content } = message;

  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded px-2 py-1 ${isSelf ? 'bg-blue-100' : 'bg-slate-100'}`}
      >
        {content}
        {info && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
            {info.icon && (
              <CachedImage src={info.icon} alt="league" className="w-4 h-4" />
            )}
            <span>{info.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
