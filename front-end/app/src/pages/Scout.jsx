import React, { useState } from 'react';
import Tabs from '../components/Tabs.jsx';

export default function Scout() {
  const [active, setActive] = useState('find');
  return (
    <div className="p-4">
      <Tabs
        tabs={[
          { value: 'find', label: 'Find a Clan' },
          { value: 'need', label: 'Need a Clan' },
        ]}
        active={active}
        onChange={setActive}
      />
      {active === 'find' && <p>Coming soon...</p>}
      {active === 'need' && <p>Coming soon...</p>}
    </div>
  );
}
