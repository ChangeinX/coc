import React from 'react';
import CachedImage from './CachedImage.jsx';

export default function RecruitCard({
  clanTag,
  deepLink,
  name,
  labels = [],
  language,
  chatLanguage,
  memberCount,
  members,
  warLeague,
  clanLevel,
  requiredTrophies,
  requiredTownhallLevel,
  onJoin,
  onClick,
}) {
  const lang = language || chatLanguage;
  const count =
    typeof memberCount === 'number'
      ? memberCount
      : typeof members === 'number'
        ? members
        : undefined;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className="w-full text-left p-3 border rounded-md bg-white shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{name}</h3>
        {deepLink && (
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
        )}
      </div>
      {lang && (
        <p className="text-xs text-slate-500 mt-1">
          {typeof lang === 'string' ? lang : lang.name}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-700">
        {typeof count === 'number' && <span>{count}/50 members</span>}
        {warLeague?.name && <span>{warLeague.name}</span>}
        {clanLevel && <span>Level {clanLevel}</span>}
        {requiredTrophies && <span>{requiredTrophies}+ trophies</span>}
        {requiredTownhallLevel && <span>TH {requiredTownhallLevel}+</span>}
      </div>
      {labels.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {labels.map((l) => (
            <CachedImage
              key={l.id || l.name}
              src={l.iconUrls?.small || l.iconUrls?.medium}
              alt={l.name}
              className="w-8 h-8"
            />
          ))}
        </div>
      )}
    </div>
  );
}

