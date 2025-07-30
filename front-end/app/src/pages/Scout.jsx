import React, { useState } from 'react';
import MobileTabs from '../components/MobileTabs.jsx';

export default function Scout() {
  const [active, setActive] = useState('find');
  return (
    <div className="p-4">
      <MobileTabs
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
