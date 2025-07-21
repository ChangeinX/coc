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
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      )}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-lg shadow-lg transform transition-transform ${open ? 'translate-y-0' : 'translate-y-full'} sm:max-w-md sm:mx-auto z-[60]`}
        style={{ maxHeight: 'calc(100dvh - var(--bottom-bar-h, 56px))' }}
      >
        {children}
      </div>
    </>
  );
}
