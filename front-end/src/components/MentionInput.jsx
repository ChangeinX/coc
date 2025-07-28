import React, { useState, useRef } from 'react';

export default function MentionInput({ value, onChange, members = [], ...props }) {
  const [showList, setShowList] = useState(false);
  const [query, setQuery] = useState('');
  const [start, setStart] = useState(0);
  const ref = useRef(null);

  function update(val, pos) {
    const at = val.lastIndexOf('@', pos - 1);
    if (at >= 0 && (at === 0 || /\s/.test(val[at - 1]))) {
      const q = val.slice(at + 1, pos);
      if (q.length > 0) {
        setQuery(q.toLowerCase());
        setStart(at);
        setShowList(true);
        return;
      }
    }
    setShowList(false);
  }

  function handleChange(e) {
    const val = e.target.value;
    onChange(val);
    update(val, e.target.selectionStart);
  }

  function select(member) {
    const before = value.slice(0, start);
    const after = value.slice(start + query.length + 1);
    const insert = `@${member.name}`;
    const newVal = `${before}${insert}${after}`;
    onChange(newVal);
    setShowList(false);
    setQuery('');
    ref.current?.focus();
  }

  const filtered = members
    .filter((m) => m.name.toLowerCase().includes(query))
    .slice(0, 5);

  return (
    <div className="relative flex-1">
      <input
        ref={ref}
        className="w-full border rounded px-2 py-1"
        value={value}
        onChange={handleChange}
        {...props}
      />
      {showList && filtered.length > 0 && (
        <ul className="absolute bottom-full mb-1 z-10 bg-white border rounded shadow w-full max-h-40 overflow-auto">
          {filtered.map((m) => (
            <li
              key={m.tag}
              className="px-2 py-1 hover:bg-slate-100 cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                select(m);
              }}
            >
              {m.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
