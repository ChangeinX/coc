import React from 'react';

export default function Banned() {
  return (
    <div className="min-h-[100dvh] flex flex-col text-center">
      <header className="banner bg-gradient-to-r from-blue-600 via-blue-700 to-slate-800 text-white p-4 shadow-md">
        <h1 className="text-lg font-semibold">Clan Dashboard</h1>
      </header>
      <main className="flex-1 flex flex-col justify-center items-center px-4 space-y-4">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="max-w-md text-sm text-slate-600">
          Your account has been permanently banned for violations of our code of conduct.
          Continued use of this site is prohibited by our legal terms.
        </p>
      </main>
    </div>
  );
}
