import React from 'react';

export default function ChatDrawer({ open, onClose, children }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      )}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-lg shadow-lg z-50 transform transition-transform ${open ? 'translate-y-0' : 'translate-y-full'} sm:top-0 sm:bottom-0 sm:right-0 sm:w-80 sm:translate-y-0 sm:rounded-none`}
      >
        {children}
      </div>
    </>
  );
}
