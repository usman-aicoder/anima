import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anima — Human Proxy Dashboard',
  description: 'Approve goals, process escalations, manage human tasks',
};

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/goals', label: 'Goals' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/escalations', label: 'Escalations' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/onboard', label: 'Onboarding' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-8">
            <span className="font-semibold text-brand-600 text-lg tracking-tight">Anima</span>
            <nav className="flex gap-6">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">{children}</main>
        </div>
      </body>
    </html>
  );
}
