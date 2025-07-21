import React, { useEffect } from 'react';

export default function BottomSheet({ open, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {open && (
        <div
          className="fixed left-0 right-0 top-0 bg-black/40 z-[60]"
          style={{ bottom: 'var(--bottom-bar-h, 56px)' }}
          onClick={onClose}
        ></div>
      )}
      <div
        className={`fixed left-0 right-0 bg-white rounded-t-lg shadow-lg z-[70] transform transition-transform ${open ? 'translate-y-0' : 'translate-y-full'} sm:max-w-md sm:mx-auto`}
        style={{
          top: 0,
          bottom: 'var(--bottom-bar-h, 56px)',
        }}
      >
        {children}
      </div>
    </>
  );
}
