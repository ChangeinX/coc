import React, { useState } from 'react';
import CachedImage from './CachedImage.jsx';

export default function RecruitCard({
  clanTag,
  deepLink,
  name,
  description,
  labels = [],
  openSlots,
  warFrequency,
  language,
  callToAction,
  onJoin,
}) {
  const [showLabels, setShowLabels] = useState(false);
  const showOpenSlots = typeof openSlots === 'number' && !Number.isNaN(openSlots);

  function handleClick() {
    setShowLabels((s) => !s);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      className="w-full text-left p-3 border-b bg-white"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{name}</h3>
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            onJoin?.();
          }}
          className="text-xs text-slate-500"
        >
          {clanTag}
        </a>
      </div>
      {(warFrequency || language) && (
        <p className="text-xs text-slate-500 mt-1">
          {warFrequency}
          {warFrequency && language ? ' • ' : ''}
          {typeof language === 'string' ? language : language?.name}
        </p>
      )}
      {description && (
        <p className="text-sm line-clamp-2 mt-1 text-slate-700">{description}</p>
      )}
      {callToAction && (
        <p className="text-sm line-clamp-2 mt-1 text-slate-700">{callToAction}</p>
      )}
      {showOpenSlots && (
        <div className="mt-2">
          <div className="h-2 bg-slate-200 rounded">
            <div
              className="h-2 bg-blue-500 rounded"
              style={{ width: `${(openSlots / 50) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{openSlots} open slots</p>
        </div>
      )}
      {labels.length > 0 && (
        <div className="flex gap-2 mt-2">
          {labels.map((l) => (
            <div key={l.id || l.name} className="flex flex-col items-center w-12">
              <CachedImage
                src={l.iconUrls?.small || l.iconUrls?.medium}
                alt={l.name}
                className="w-8 h-8"
              />
              {showLabels && (
                <p className="text-xs text-slate-500 mt-1 text-center">{l.name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

