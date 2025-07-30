import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function Home() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('disclaimerSeen') !== 'true') {
      setShowDisclaimer(true);
    }
    if (localStorage.getItem('legalAccepted') !== 'true') {
      setShowLegal(true);
    }
  }, []);
  function acknowledge() {
    localStorage.setItem('disclaimerSeen', 'true');
    setShowDisclaimer(false);
  }

  function acceptLegal() {
    localStorage.setItem('legalAccepted', 'true');
    setShowLegal(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>Clan Boards</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.tailwindcss.com"></script>
      </Head>
      <header className="p-4 shadow bg-blue-600 text-white text-center">
        <h1 className="text-2xl font-semibold">Clan Boards</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-blue-50 to-white">
        <h2 className="text-3xl sm:text-5xl font-bold mb-4">Unleash Your Clan's Potential</h2>
        <p className="text-slate-700 max-w-md mb-6">
          Manage wars and track members with our unofficial Clash of Clans dashboard.
        </p>
        <a
          href="/app/"
          className="px-6 py-3 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700 transition"
        >
          Get Started
        </a>
      </main>
      {showDisclaimer && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={acknowledge}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-md text-center space-y-4 max-w-sm w-full relative">
              <button className="absolute top-3 right-3 text-slate-400" onClick={acknowledge}>✕</button>
              <h2 className="text-xl font-semibold">Clan Boards</h2>
              <p className="text-sm">
                This material is unofficial and is not endorsed by Supercell. For more information see{' '}
                <a
                  href="https://supercell.com/en/fan-content-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Supercell's Fan Content Policy
                </a>.
              </p>
              <button
                onClick={acknowledge}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
              >
                OK
              </button>
            </div>
          </div>
        </>
      )}
      {showLegal && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-blue-50 border-t border-blue-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <span>
            By using this website, you agree to the storing of cookies on your device to enhance site navigation,
            analyze site usage, and assist in our marketing efforts. View our{' '}
            <a href="/privacy-policy.html" className="text-blue-600 underline">Privacy Policy</a>{' '}
            for more information.
          </span>
          <button
            onClick={acceptLegal}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Accept
          </button>
        </div>
      )}
    </div>
  );
}
