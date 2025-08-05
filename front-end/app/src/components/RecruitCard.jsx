import React from 'react';
import CachedImage from './CachedImage.jsx';
import { Users, Shield, Trophy, Crown, Home } from 'lucide-react';

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
  callToAction,
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
      {callToAction && (
        <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">
          {callToAction}
        </p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
        {typeof count === 'number' && (
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-slate-500" />
            <span>{count}/50</span>
          </div>
        )}
        {warLeague?.name && (
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-slate-500" />
            <span>{warLeague.name}</span>
          </div>
        )}
        {clanLevel && (
          <div className="flex items-center gap-1">
            <Crown className="w-4 h-4 text-slate-500" />
            <span>Lv {clanLevel}</span>
          </div>
        )}
        {requiredTrophies && (
          <div className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-slate-500" />
            <span>{requiredTrophies}+</span>
          </div>
        )}
        {requiredTownhallLevel && (
          <div className="flex items-center gap-1">
            <Home className="w-4 h-4 text-slate-500" />
            <span>TH {requiredTownhallLevel}+</span>
          </div>
        )}
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

