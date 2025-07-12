import React, {useState, useEffect, useMemo} from 'react';
import PlayerModal from './PlayerModal.jsx';
import {fetchJSON} from './api.js';

function Stat({icon, label, value}) {
    return (
        <div className="flex items-center gap-3 bg-white shadow rounded p-4">
            {icon && (
                <div className="p-3 rounded-full bg-slate-200">
                    <i data-lucide={icon} className="w-7 h-7"/>
                </div>
            )}
            <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-xl font-semibold text-slate-800">{value}</p>
            </div>
        </div>
    );
}

const DEFAULT_TAG = 'UV0YR2Q8';

export default function Dashboard() {
    const [tag, setTag] = useState('');
    const [clan, setClan] = useState(null);
    const [topRisk, setTopRisk] = useState([]);
    const [members, setMembers] = useState([]);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);
    const [sortField, setSortField] = useState('');
    const [sortDir, setSortDir] = useState('asc');

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
        try {
            const clanData = await fetchJSON(`/clan/${encodeURIComponent(clanTag)}`);
            const riskData = await fetchJSON(
                `/clan/${encodeURIComponent(clanTag)}/members/at-risk`
            );
            const loyaltyMap = await fetchJSON(
                `/clan/${encodeURIComponent(clanTag)}/members/loyalty`
            );
            const rmap = Object.fromEntries(riskData.map((r) => [r.player_tag, r]));
            const merged = clanData.memberList.map((m) => ({
                ...m,

                risk_score: rmap[m.tag.replace('#', '')]?.risk_score || 0,
                last_seen: rmap[m.tag.replace('#', '')]?.last_seen || null,
                loyalty: loyaltyMap[m.tag.replace('#', '')] || 0,
            }));
            setClan(clanData);
            setMembers(merged);
            setTopRisk([...merged].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10));
            setError('');
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        load(DEFAULT_TAG);
    }, []);

    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const clanTag = tag.trim().toUpperCase();
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
        <div className="max-w-5xl mx-auto space-y-6">
            <form onSubmit={handleSubmit} className="flex gap-2 justify-center">
                <input
                    className="max-w-xs px-3 py-2 rounded border"
                    placeholder="Clan tag (without #)"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                />
                <button type="submit" className="px-4 py-2 rounded bg-slate-800 text-white">
                    Load
                </button>
            </form>
            {error && <p className="text-center text-red-600 font-medium">{error}</p>}
            {clan && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Stat icon="users" label="Members" value={members.length}/>
                        <Stat icon="shield-alert" label="Level" value={clan.clanLevel}/>
                        <Stat icon="sword" label="War Wins" value={clan.warWins || 0}/>
                        <Stat icon="shield-off" label="War Losses" value={clan.warLosses || 0}/>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-700">At-Risk Members</h2>
                    <div className="overflow-x-auto shadow bg-white rounded mb-6">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-slate-600">
                            <tr>
                                <th className="px-4 py-3">Player</th>
                                <th className="px-4 py-3">Tag</th>
                                <th className="px-4 py-3">Last Seen</th>
                                <th className="px-4 py-3">Loyalty</th>
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
                                    <td className="px-4 py-2 font-medium">{m.name}</td>
                                    <td className="px-4 py-2 text-slate-500">{m.tag}</td>
                                    <td className="px-4 py-2">{m.last_seen || '\u2014'}</td>
                                    <td className="px-4 py-2 text-center">{m.loyalty}</td>
                                    <td className="px-4 py-2">{m.risk_score}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-700">All Members</h2>
                    <div className="overflow-x-auto shadow bg-white rounded">
                        <table className="min-w-full text-sm" id="membersTable">
                            <thead className="bg-slate-50 text-left text-slate-600">
                            <tr>
                                <th className="px-3 py-2">Player</th>
                                <th
                                    className="px-3 py-2 cursor-pointer select-none"
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
                                    className="px-3 py-2 cursor-pointer select-none text-center"
                                    onClick={() => toggleSort('trophies')}
                                >
                                    Trophies {sortField === 'trophies' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                </th>
                                <th
                                    className="px-3 py-2 cursor-pointer select-none text-center"
                                    onClick={() => toggleSort('donations')}
                                >
                                    Don&nbsp;/&nbsp;Rec {sortField === 'donations' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                </th>
                                <th
                                    className="px-3 py-2 cursor-pointer select-none text-center"
                                    onClick={() => toggleSort('last')}
                                >
                                    Last Seen {sortField === 'last' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                                </th>
                                <th
                                    className="px-3 py-2 cursor-pointer select-none text-center"
                                    onClick={() => toggleSort('loyalty')}
                                >
                                    Loyalty {sortField === 'loyalty' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
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
                                    <td className="px-3 py-2 font-medium">{m.name}</td>
                                    <td className="px-3 py-2">{m.role}</td>
                                    <td className="px-3 py-2 text-center">{m.townHallLevel}</td>
                                    <td className="px-3 py-2 text-center">{m.trophies}</td>
                                    <td className="px-3 py-2 text-center">
                                        {m.donations}/{m.donationsReceived}
                                    </td>
                                    <td className="px-3 py-2 text-center">{m.last_seen || '\u2014'}</td>
                                    <td className="px-3 py-2 text-center">{m.loyalty}</td>
                                    <td className="px-3 py-2 text-center">{m.risk_score}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
            {selected && <PlayerModal tag={selected} onClose={() => setSelected(null)}/>}
        </div>
    );
}
