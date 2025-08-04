import React from 'react';
import RecruitCard from './RecruitCard.jsx';

export default function RecruitDetail({ clan, onClose }) {
  if (!clan) return null;
  const metadata = [
    { label: 'Description', value: clan.description },
    { label: 'War Frequency', value: clan.warFrequency },
    { label: 'War Wins', value: clan.warWins },
    { label: 'Win Streak', value: clan.warWinStreak },
    { label: 'Clan Points', value: clan.clanPoints },
    { label: 'Versus Points', value: clan.clanBuilderBasePoints },
    { label: 'Location', value: clan.location?.name },
  ].filter((m) => m.value);
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div
        className="fixed inset-0 overflow-auto z-50 flex items-start justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-xl rounded-xl shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <RecruitCard
            clanTag={clan.clanTag}
            deepLink={clan.deepLink}
            name={clan.name}
            labels={clan.labels}
            chatLanguage={clan.language}
            members={clan.memberCount}
            warLeague={clan.warLeague}
            clanLevel={clan.clanLevel}
            requiredTrophies={clan.requiredTrophies}
            requiredTownhallLevel={clan.requiredTownhallLevel}
            onJoin={() => {}}
          />
          <div className="p-4">
            {metadata.length === 0 && (
              <div className="text-center text-slate-500">No additional info</div>
            )}
            {metadata.length > 0 && (
              <ul className="divide-y">
                {metadata.map((m) => (
                  <li key={m.label} className="py-2 flex justify-between text-sm">
                    <span className="font-medium">{m.label}</span>
                    <span className="text-slate-700 text-right">{m.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
