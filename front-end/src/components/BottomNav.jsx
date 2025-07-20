import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, MessageCircle, Users, User } from 'lucide-react';
import { proxyImageUrl } from '../lib/assets.js';

export default function BottomNav({ clanIcon }) {
  const items = [
    { to: '/', label: 'Home', icon: Shield },
    { to: '/chat', label: 'Chat', icon: MessageCircle },
    { to: '/community', label: 'Community', icon: Users },
    { to: '/account', label: 'Account', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex sm:hidden z-50">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex-1 py-2 text-center flex flex-col items-center ${isActive ? 'text-blue-600' : 'text-slate-600'}`
          }
        >
          {item.to === '/' && clanIcon ? (
            <img src={proxyImageUrl(clanIcon)} alt="clan" className="w-5 h-5" />
          ) : (
            React.createElement(item.icon, { className: 'w-5 h-5' })
          )}
          <span className="text-xs mt-1">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
