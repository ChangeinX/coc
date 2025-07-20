import React, { useEffect } from 'react';

export default function Login() {
  useEffect(() => {
    const init = () => {
      if (!window.google) return false;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (res) => {
          localStorage.setItem('token', res.credential);
          window.location.hash = '#/';
          window.location.reload();
        },
      });
      window.google.accounts.id.renderButton(
        document.getElementById('signin'),
        { theme: 'outline', size: 'large', width: 240 }
      );
      window.google.accounts.id.prompt();
      return true;
    };

    if (!init()) {
      const id = setInterval(() => {
        if (init()) clearInterval(id);
      }, 100);
      return () => clearInterval(id);
    }
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="banner bg-gradient-to-r from-blue-600 via-blue-700 to-slate-800 text-white p-4 text-center shadow-md">
        <h1 className="text-lg font-semibold">Clan Dashboard</h1>
      </header>
      <main className="flex-1 flex flex-col justify-center items-center px-4 text-center space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Welcome</h2>
          <p className="text-sm text-slate-600">Login or register to continue</p>
        </div>
        <div id="signin" />
      </main>
    </div>
  );
}

