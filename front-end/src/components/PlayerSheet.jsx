import React, { useState } from 'react';
import BottomSheet from './BottomSheet.jsx';
import Tabs from './Tabs.jsx';
import PlayerSummary from './PlayerSummary.jsx';

export default function PlayerSheet({ tag, onClose }) {
  const [active, setActive] = useState('overview');
  if (!tag) return null;
  return (
    <BottomSheet open={!!tag} onClose={onClose}>
      <Tabs
        tabs={[{ value: 'overview', label: 'Overview' }]}
        active={active}
        onChange={setActive}
      />
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
        {active === 'overview' && <PlayerSummary tag={tag} />}
      </div>
    </BottomSheet>
  );
}
