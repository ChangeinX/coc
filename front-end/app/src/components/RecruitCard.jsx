import React from 'react';
import CachedImage from './CachedImage.jsx';
import { Users, Shield, Crown, Trash2 } from 'lucide-react';
import { timeAgo } from '../lib/time.js';

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
  requiredBuilderBaseTrophies,
  requiredTownhallLevel,
  callToAction,
  onJoin,
  onClick,
  createdAt,
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
      <div className="flex items-start justify-between">
        <div>
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
              className="text-xs text-slate-500 block"
            >
              {clanTag}
            </a>
          )}
        </div>
        <button
          type="button"
          aria-label="Delete post"
          className="text-slate-500"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {lang && (
        <p className="text-xs text-slate-500 mt-1">
          Language: {typeof lang === 'string' ? lang : lang.name}
        </p>
      )}
      {(requiredTownhallLevel || requiredTrophies || requiredBuilderBaseTrophies) && (
        <div className="mt-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase">
            Requirements
          </h4>
          <div className="flex gap-2 mt-1 flex-wrap">
            {requiredTownhallLevel && (
              <span className="bg-slate-200 px-2 py-0.5 rounded-full text-xs">
                TH {requiredTownhallLevel}+
              </span>
            )}
            {requiredTrophies && (
              <span className="bg-slate-200 px-2 py-0.5 rounded-full text-xs">
                Base Trophies: {requiredTrophies}+
              </span>
            )}
            {requiredBuilderBaseTrophies && (
              <span className="bg-slate-200 px-2 py-0.5 rounded-full text-xs">
                Builder Base Trophies: {requiredBuilderBaseTrophies}+
              </span>
            )}
          </div>
        </div>
      )}
      {(typeof count === 'number' || warLeague?.name || clanLevel || labels.length > 0) && (
        <div className="mt-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase">
            Clan Info
          </h4>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-700">
            {typeof count === 'number' && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4 text-slate-500" />
                <span>{count}/50</span>
              </span>
            )}
            {warLeague?.name && (
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-slate-500" />
                <span>{warLeague.name}</span>
              </span>
            )}
            {clanLevel && (
              <span className="flex items-center gap-1">
                <Crown className="w-4 h-4 text-slate-500" />
                <span>Lv {clanLevel}</span>
              </span>
            )}
            {labels.map((l) => (
              <span
                key={l.id || l.name}
                className="flex items-center gap-1"
                title={l.name}
              >
                <CachedImage
                  src={l.iconUrls?.small || l.iconUrls?.medium}
                  alt={l.name}
                  className="w-6 h-6"
                />
                <span>{l.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {callToAction && (
        <div className="mt-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase">
            Description
          </h4>
          <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
            {callToAction}
          </p>
        </div>
      )}
      {createdAt && (
        <p className="mt-2 text-xs text-slate-500 text-right">
          {timeAgo(createdAt)}
        </p>
      )}
    </div>
  );
}

