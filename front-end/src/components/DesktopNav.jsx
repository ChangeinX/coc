import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, MessageCircle, Users, BarChart2, User } from 'lucide-react';
import CachedImage from './CachedImage.jsx';

export default function DesktopNav({ clanIcon }) {
  const items = [
    { to: '/', label: 'Home', icon: Shield },
    { to: '/chat', label: 'Chat', icon: MessageCircle },
    { to: '/scout', label: 'Scout', icon: Users },
    { to: '/stats', label: 'Stats', icon: BarChart2 },
    { to: '/account', label: 'Account', icon: User },
  ];

  return (
    <nav className="hidden sm:flex gap-6 px-4 py-2 bg-white border-b">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-1 ${isActive ? 'text-blue-600' : 'text-slate-700'}`
          }
        >
          {item.to === '/' && clanIcon ? (
            <CachedImage src={clanIcon} alt="clan" className="w-4 h-4" />
          ) : (
            React.createElement(item.icon, { className: 'w-4 h-4' })
          )}
          <span className="text-sm">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
