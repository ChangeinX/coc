import React, { useState } from 'react';
import Tabs from './Tabs.jsx';
import RecruitCard from './RecruitCard.jsx';
import useClanInfo from '../hooks/useClanInfo.js';
import RiskRing from './RiskRing.jsx';
import DonationRing from './DonationRing.jsx';

export default function RecruitDetail({ clan, onClose }) {
  const [tab, setTab] = useState('health');
  const info = useClanInfo(clan?.clanTag);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 overflow-auto z-50 flex items-start justify-center p-4">
        <div className="bg-white w-full max-w-xl rounded-xl shadow-xl">
          <RecruitCard
            clanTag={clan.clanTag}
            deepLink={clan.deepLink}
            name={clan.name}
            labels={clan.labels}
            language={clan.language}
            memberCount={clan.memberCount}
            warLeague={clan.warLeague}
            clanLevel={clan.clanLevel}
            requiredTrophies={clan.requiredTrophies}
            requiredTownhallLevel={clan.requiredTownhallLevel}
            onJoin={() => {}}
          />
          <Tabs
            tabs={[
              { value: 'health', label: 'Clan Health' },
              { value: 'overview', label: 'Clan Overview' },
            ]}
            active={tab}
            onChange={setTab}
          />
          {tab === 'health' && (
            <div className="p-4">
              {!info && (
                <div className="text-center text-slate-500">Loading…</div>
              )}
              {info && (
                <ul className="divide-y">
                  {info.members?.map((m) => (
                    <li
                      key={m.tag}
                      className="flex justify-between items-center py-2"
                    >
                      <span className="text-sm">{m.name}</span>
                      <div className="flex items-center gap-2">
                        <RiskRing score={m.risk_score} size={32} />
                        <DonationRing
                          donations={m.donations}
                          received={m.donationsReceived}
                          size={32}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {tab === 'overview' && (
            <div className="p-4 text-center text-slate-500">Coming soon…</div>
          )}
        </div>
      </div>
    </>
  );
}

