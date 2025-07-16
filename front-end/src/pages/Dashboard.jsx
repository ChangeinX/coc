import React, {useState, useEffect, useMemo, Suspense, lazy} from 'react';
import Loading from '../components/Loading.jsx';
import {fetchJSONCached} from '../lib/api.js';
import { timeAgo } from '../lib/time.js';
import MobileTabs from '../components/MobileTabs.jsx';
import RiskRing from '../components/RiskRing.jsx';
import DonationRing from '../components/DonationRing.jsx';
import MemberAccordionList from '../components/MemberAccordionList.jsx';
import ProfileCard from '../components/ProfileCard.jsx';
import { getTownHallIcon } from '../lib/townhall.js';
import { proxyImageUrl } from '../lib/assets.js';

const winStreakIcon = new URL('../assets/win-streak.svg', import.meta.url).href;
const levelIcon = new URL('../assets/level.svg', import.meta.url).href;
const warWinsIcon = new URL('../assets/war-wins.svg', import.meta.url).href;
const warLossesIcon = new URL('../assets/war-losses.svg', import.meta.url).href;

const PlayerModal = lazy(() => import('../components/PlayerModal.jsx'));


function Stat({icon, iconUrl, label, value, onClick}) {
    return (
        <div
            className={`flex items-center gap-3 bg-white shadow rounded p-4 ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            {(iconUrl || icon) && (
                <div className="p-3 rounded-full bg-slate-200">
                    {iconUrl ? (
                        <img src={proxyImageUrl(iconUrl)} alt="icon" className="w-7 h-7" />
                    ) : (
                        <i data-lucide={icon} className="w-7 h-7"/>
                    )}
                </div>
            )}
            <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-xl font-semibold text-slate-800">{value}</p>
            </div>
        </div>
    );
}

export default function Dashboard({ defaultTag, showSearchForm = true, onClanLoaded }) {
    const [tag, setTag] = useState('');
    const [clan, setClan] = useState(null);
    const [topRisk, setTopRisk] = useState([]);
    const [members, setMembers] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [selected, setSelected] = useState(null);
    const [sortField, setSortField] = useState('');
    const [sortDir, setSortDir] = useState('asc');
    const [activeTab, setActiveTab] = useState('top');
    const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width:640px)').matches);
    const [listHeight, setListHeight] = useState(() => Math.min(500, window.innerHeight - 200));

    const sortedMembers = useMemo(() => {
        if (!sortField) return members;
        const getVal = (m) => {
            switch (sortField) {
                case 'role':
                    return m.role || '';
                case 'th':
                    return m.townHallLevel;
                case 'trophies':
                    return m.trophies;
                case 'donations':
                    return m.donations;
                case 'last':
                    return m.last_seen ? new Date(m.last_seen).getTime() : 0;
                case 'loyalty':
                    return m.loyalty;
                case 'risk':
                    return m.risk_score;
                default:
                    return 0;
            }
        };
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...members].sort((a, b) => {
            const v1 = getVal(a);
            const v2 = getVal(b);
            if (v1 < v2) return -1 * dir;
            if (v1 > v2) return 1 * dir;
            return 0;
        });
    }, [members, sortField, sortDir]);

    const load = async (clanTag) => {
        const cacheKey = `clan:${clanTag}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const data = JSON.parse(cached);
                setClan(data.clan);
                if (onClanLoaded) onClanLoaded(data.clan);
                setMembers(data.members);
                setTopRisk(data.topRisk.slice(0, 5));
            } catch {
                localStorage.removeItem(cacheKey);
            }
        } else {
            setLoading(true);
        }
        setRefreshing(true);

        try {
            const clanData = await fetchJSONCached(`/clan/${encodeURIComponent(clanTag)}`);
            const riskData = await fetchJSONCached(
                `/clan/${encodeURIComponent(clanTag)}/members/at-risk`
            );
            const loyaltyMap = await fetchJSONCached(
                `/clan/${encodeURIComponent(clanTag)}/members/loyalty`
            );
            const rmap = Object.fromEntries(riskData.map((r) => [r.player_tag, r]));
            const merged = clanData.memberList.map((m) => {
                const raw = rmap[m.tag.replace('#', '')]?.last_seen || null;
                return {
                    ...m,
                    risk_score: rmap[m.tag.replace('#', '')]?.risk_score || 0,
                    last_seen: raw,
                    risk_breakdown: rmap[m.tag.replace('#', '')]?.risk_breakdown || [],
                    loyalty: loyaltyMap[m.tag.replace('#', '')] || 0,
                };
            });
            const top = [...merged]
                .sort((a, b) => b.risk_score - a.risk_score)
                .slice(0, 5);
            setClan(clanData);
            if (onClanLoaded) onClanLoaded(clanData);
            setMembers(merged);
            setTopRisk(top);
            setError('');
            try {
                localStorage.setItem(cacheKey, JSON.stringify({ clan: clanData, members: merged, topRisk: top }));
            } catch {
                /* ignore */
            }
        } catch (err) {
            if (!clan) setError(err.message);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        if (defaultTag) {
            load(defaultTag);
        }
    }, [defaultTag]);

    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    });

    useEffect(() => {
        document.title = clan?.name || 'Clan Dashboard';
    }, [clan]);

    useEffect(() => {
        const mq = window.matchMedia('(min-width:640px)');
        const handler = (e) => setIsDesktop(e.matches);
        mq.addEventListener('change', handler);
        setIsDesktop(mq.matches);
        return () => mq.removeEventListener('change', handler);
    }, []);


    useEffect(() => {
        const handler = () => setListHeight(Math.min(500, window.innerHeight - 200));
        window.addEventListener('resize', handler);
        handler();
        return () => window.removeEventListener('resize', handler);
    }, []);


    const handleSubmit = (e) => {
        e.preventDefault();
        let clanTag = tag.trim().toUpperCase();
        if (clanTag.startsWith('#')) clanTag = clanTag.slice(1);
        if (clanTag) load(clanTag);
    };

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };



    return (
        <div className="max-w-5xl mx-auto space-y-6 relative">
            {showSearchForm && (
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col sm:flex-row gap-2 justify-center"
                >
                    <input
                        className="flex-1 w-full px-3 py-2 rounded border"
                        placeholder="Clan tag"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 rounded bg-slate-800 text-white w-full sm:w-auto"
                    >
                        Load
                    </button>
                </form>
            )}
            {error && <p className="text-center text-red-600 font-medium">{error}</p>}
            {loading && !clan && <Loading className="py-20"/>}
            {loading && clan && <Loading className="py-4"/>}
            {clan && (
                <>
                    <div className="flex justify-center mt-6">
                        <Stat
                            iconUrl={winStreakIcon}
                            label="Win Streak"
                            value={clan.warWinStreak || 0}
                        />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Stat
                            icon="users"
                            iconUrl={clan.badgeUrls?.small}
                            label="Members"
                            value={members.length}
                        />
                        <Stat
                            iconUrl={levelIcon}
                            label="Level"
                            value={clan.clanLevel}
                        />
                        <Stat
                            iconUrl={warWinsIcon}
                            label="War Wins"
                            value={clan.warWins || 0}
                        />
                        <Stat
                            iconUrl={warLossesIcon}
                            label="War Losses"
                            value={clan.warLosses || 0}
                        />
                    </div>
                    {isDesktop ? (
                        <>
                            <h2 className="text-xl font-semibold text-slate-700">At-Risk Members</h2>
                            <div className="overflow-x-auto shadow bg-white rounded mb-6">
                                <table className="mobile-table min-w-full text-xs sm:text-sm">
                                    <thead className="bg-slate-50 text-left text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3">Player</th>
                                        <th className="px-4 py-3">Tag</th>
                                        <th className="px-4 py-3">Days in Clan</th>
                                        <th className="px-4 py-3">Score</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {topRisk.map((m) => (
                                        <tr
                                            key={m.tag}
                                            className="border-b last:border-none hover:bg-rose-50 cursor-pointer"
                                            onClick={() => setSelected(m.tag)}
                                        >
                                            <td data-label="Player" className="px-4 py-2 font-medium">
                                                <span className="flex items-center gap-2">
                                                    {m.leagueIcon && (
                                                        <img src={proxyImageUrl(m.leagueIcon)} alt="league" className="w-5 h-5" />
                                                    )}
                                                    <img
                                                        src={getTownHallIcon(m.townHallLevel)}
                                                        alt={`TH${m.townHallLevel}`}
                                                        className="w-5 h-5"
                                                    />
                                                    {m.name}
                                                </span>
                                            </td>
                                            <td data-label="Tag" className="px-4 py-2 text-slate-500">{m.tag}</td>
                                            <td data-label="Days in Clan" className="px-4 py-2 text-center">{m.loyalty}</td>
                                            <td data-label="Score" className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    {refreshing && !loading ? (
                                                        <Loading size={40} />
                                                    ) : (
                                                        <RiskRing score={m.risk_score} size={40} />
                                                    )}
                                                    {m.risk_breakdown && m.risk_breakdown.length > 0 && (
                                                        <ul className="list-disc list-inside text-xs">
                                                            {m.risk_breakdown.map((r, i) => (
                                                                <li key={i}>{r.points} pts – {r.reason}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                            <h2 className="text-xl font-semibold text-slate-700">All Members</h2>
                            <div className="overflow-x-auto shadow bg-white rounded">
                                <table className="mobile-table min-w-full text-xs sm:text-sm" id="membersTable">
                                    <thead className="bg-slate-50 text-left text-slate-600">
                                    <tr>
                                        <th className="px-3 py-2">Player</th>
                                        <th
                                            className="px-3 py-2 cursor-pointer select-none hidden sm:table-cell"
                                            onClick={() => toggleSort('role')}
                                        >
                                            Role {sortField === 'role' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                        </th>
                                        <th
                                            className="px-3 py-2 cursor-pointer select-none text-center"
                                            onClick={() => toggleSort('th')}
                                        >
                                            TH {sortField === 'th' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                        </th>
                                        <th
                                            className="px-3 py-2 cursor-pointer select-none text-center hidden md:table-cell"
                                            onClick={() => toggleSort('trophies')}
                                        >
                                            Trophies {sortField === 'trophies' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                        </th>
                                        <th
                                            className="px-3 py-2 cursor-pointer select-none text-center hidden md:table-cell"
                                            onClick={() => toggleSort('donations')}
                                        >
                                            Don&nbsp;/&nbsp;Rec {sortField === 'donations' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                        </th>
                                        <th
                                            className="px-3 py-2 cursor-pointer select-none text-center hidden sm:table-cell"
                                            onClick={() => toggleSort('loyalty')}
                                        >
                                            Days in Clan {sortField === 'loyalty' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                        </th>
                                        <th
                                            className="px-3 py-2 cursor-pointer select-none text-center"
                                            onClick={() => toggleSort('risk')}
                                        >
                                            Risk {sortField === 'risk' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {sortedMembers.map((m) => (
                                        <tr
                                            key={m.tag}
                                            className="border-b last:border-none hover:bg-slate-50 cursor-pointer"
                                            onClick={() => setSelected(m.tag)}
                                        >
                                            <td data-label="Player" className="px-3 py-2 font-medium">
                                                <div className="flex flex-col">
                                                    <span className="flex items-center gap-2">
                                                        {m.leagueIcon && (
                                                            <img src={proxyImageUrl(m.leagueIcon)} alt="league" className="w-5 h-5" />
                                                        )}
                                                        <img
                                                            src={getTownHallIcon(m.townHallLevel)}
                                                            alt={`TH${m.townHallLevel}`}
                                                            className="w-5 h-5"
                                                        />
                                                        {m.name}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {m.last_seen ? timeAgo(m.last_seen) : '\u2014'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td data-label="Role" className="px-3 py-2 hidden sm:table-cell">{m.role}</td>
                                            <td data-label="TH" className="px-3 py-2 text-center">{m.townHallLevel}</td>
                                            <td data-label="Trophies" className="px-3 py-2 text-center hidden md:table-cell">{m.trophies}</td>
                                            <td data-label="Don/Rec" className="px-3 py-2 text-center hidden md:table-cell">
                                                <div className="flex items-center justify-center gap-2">
                                                    {m.donations}/{m.donationsReceived}
                                                    <DonationRing donations={m.donations} received={m.donationsReceived} size={36} />
                                                </div>
                                            </td>
                                            <td data-label="Days in Clan" className="px-3 py-2 text-center hidden sm:table-cell">{m.loyalty}</td>
                                            <td data-label="Risk" className="px-3 py-2 text-center">
                                                {refreshing && !loading ? (
                                                    <Loading size={36} />
                                                ) : (
                                                    <RiskRing score={m.risk_score} size={36} />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <>
                            <MobileTabs
                                tabs={[{ value: 'top', label: 'Top 5 At-Risk' }, { value: 'all', label: 'All Members' }]}
                                active={activeTab}
                                onChange={setActiveTab}
                            />
                            {activeTab === 'top' && (
                                <div className="flex overflow-x-auto gap-3 px-4 py-3 scroller">
                                    {topRisk.map((m) => (
                                        <ProfileCard
                                            key={m.tag}
                                            member={m}
                                            refreshing={refreshing && !loading}
                                            onClick={() => setSelected(m.tag)}
                                        />
                                    ))}
                                </div>
                            )}
                            {activeTab === 'all' && (
                                <div className="bg-white rounded shadow" style={{ height: listHeight }}>
                                    <MemberAccordionList
                                        members={sortedMembers}
                                        height={listHeight}
                                        refreshing={refreshing && !loading}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
            {selected && (
                <Suspense fallback={<Loading className="py-8"/>}>
                    <PlayerModal
                        tag={selected}
                        onClose={() => setSelected(null)}
                        refreshing={refreshing && !loading}
                    />
                </Suspense>
            )}
        </div>
    );
}
