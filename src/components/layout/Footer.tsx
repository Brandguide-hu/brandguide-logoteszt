'use client';

export function Footer() {
  return (
    <footer className="bg-bg-primary border-t border-bg-tertiary mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="font-semibold text-text-primary">Logóteszt</span>
            <span className="text-text-muted">by</span>
            <a
              href="https://brandguide.hu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-yellow hover:text-accent-yellow-hover font-medium transition-colors"
            >
              Brandguide
            </a>
          </div>

          <p className="text-sm text-text-muted text-center">
            A logó nem ízlés kérdése – szigorú szakmai szempontoknak kell megfelelnie.
          </p>

          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <a
              href="https://brandguide.hu"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors"
            >
              Brandguide/AI
            </a>
            <span className="text-bg-tertiary">|</span>
            <span className="text-text-muted">
              © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
