'use client';
import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function Home() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [appUrl, setAppUrl] = useState('https://app.clan-boards.com');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.replace(/^www\./, '');
      setAppUrl(`${window.location.protocol}//app.${hostname}`);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('disclaimerSeen') !== 'true') {
        setShowDisclaimer(true);
      }
      if (localStorage.getItem('legalAccepted') !== 'true') {
        setShowLegal(true);
      }
    }
  }, []);

  function acknowledge() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('disclaimerSeen', 'true');
    }
    setShowDisclaimer(false);
  }

  function acceptLegal() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('legalAccepted', 'true');
    }
    setShowLegal(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>Clan Boards</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.tailwindcss.com"></script>
      </Head>
      <header className="sticky top-0 bg-white shadow">
        <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-xl">Clan Boards</span>
          <ul className="flex items-center gap-4 text-sm font-medium">
            <li>
              <a href="#features" className="hover:underline">
                Product
              </a>
            </li>
            <li>
              <a href="#donate" className="hover:underline">
                Donate
              </a>
            </li>
            <li>
              <a href="/docs" className="hover:underline">
                Docs
              </a>
            </li>
            <li>
              <a
                href={appUrl}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Open App
              </a>
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex-grow">
        <section className="text-center py-20 bg-gradient-to-b from-blue-50 to-white">
          <h1 className="text-4xl sm:text-6xl font-extrabold mb-4">
            Unleash Your Clan's Potential
          </h1>
          <p className="text-slate-700 max-w-xl mx-auto mb-6">
            Manage wars and track members with our unofficial Clash of Clans dashboard.
          </p>
          <a
            href={appUrl}
            className="px-6 py-3 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700 transition"
          >
            Get Started
          </a>
        </section>

        <section id="features" className="py-12">
          <div className="max-w-5xl mx-auto grid gap-8 sm:grid-cols-3 text-center">
            <div>
              <div className="h-12 w-12 mx-auto bg-blue-100 rounded-full mb-4" />
              <h3 className="font-semibold mb-2">Plan Wars</h3>
              <p className="text-sm text-slate-600">
                Coordinate attacks and track results with ease.
              </p>
            </div>
            <div>
              <div className="h-12 w-12 mx-auto bg-blue-100 rounded-full mb-4" />
              <h3 className="font-semibold mb-2">Member Insights</h3>
              <p className="text-sm text-slate-600">
                Monitor player activity and performance over time.
              </p>
            </div>
            <div>
              <div className="h-12 w-12 mx-auto bg-blue-100 rounded-full mb-4" />
              <h3 className="font-semibold mb-2">Chat Anywhere</h3>
              <p className="text-sm text-slate-600">
                Keep in touch using our integrated messaging tool.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 bg-blue-50">
          <h2 className="text-center text-xl font-semibold mb-6">
            Trusted by players worldwide
          </h2>
          <div className="flex justify-center gap-6 opacity-75">
            <div className="h-8 w-20 bg-gray-300 rounded" />
            <div className="h-8 w-20 bg-gray-300 rounded" />
            <div className="h-8 w-20 bg-gray-300 rounded" />
          </div>
        </section>

        <section id="donate" className="py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl font-semibold mb-4">Donate</h2>
            <p className="mb-6">
              Clan Boards is free and displays ads to comply with Supercell's policy.
              Donations help keep the lights on.
            </p>
            <a href="/donate" className="px-6 py-3 bg-blue-600 text-white rounded">
              Donate
            </a>
          </div>
        </section>
      </main>
      <footer className="bg-slate-800 text-slate-100 text-sm py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 px-4">
          <a href="/about.html" className="hover:underline">About Us</a>
          <a href="/contact.html" className="hover:underline">Contact Us</a>
          <a href="/support.html" className="hover:underline">Support/Help Center</a>
          <a href="/privacy-policy.html" className="hover:underline">Privacy Policy</a>
          <a href="/terms.html" className="hover:underline">Terms of Service</a>
          <a href="/cookies-20250729.html" className="hover:underline">Cookie Policy</a>
          <a href="/accessibility.html" className="hover:underline">Accessibility</a>
          <a href="https://status.clan-boards.com" className="hover:underline">Status</a>
        </div>
      </footer>
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
