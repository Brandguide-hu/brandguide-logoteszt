'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="bg-bg-primary border-b border-bg-tertiary sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🎯</span>
            <span className="font-bold text-xl text-text-primary group-hover:text-accent-yellow transition-colors">
              Logóteszt
            </span>
            <span className="text-xs text-text-muted font-medium bg-bg-secondary px-2 py-0.5 rounded">
              by Brandguide
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/teszt"
              className="text-text-secondary hover:text-text-primary font-medium transition-colors"
            >
              Teszt indítása
            </Link>
            <a
              href="https://brandguide.hu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-text-primary font-medium transition-colors"
            >
              Brandguide.hu
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
