import { useEffect, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import { getClanCache, putClanCache } from '../lib/db.js';

export default function useClanMembers(clanTag) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!clanTag) return;
    let ignore = false;
    const key = `members:${clanTag}`;
    (async () => {
      const cached = await getClanCache(key);
      if (cached && !ignore) {
        setMembers(cached.members || []);
      }
      try {
        const data = await fetchJSONCached(`/clan/${encodeURIComponent(clanTag)}`);
        if (!ignore) setMembers(data.memberList || []);
        try {
          await putClanCache({ key, members: data.memberList || [] });
        } catch (err) {
          console.error('Failed to cache clan members', err);
        }
      } catch (err) {
        console.error('Failed to load clan members', err);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [clanTag]);

  return members;
}
