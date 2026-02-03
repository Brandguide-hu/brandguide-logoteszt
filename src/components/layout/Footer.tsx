import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-3">
              <img src="/logolab-logo-newLL.svg" alt="LogoLab" className="h-8 brightness-0 invert" />
            </div>
            <p className="text-sm text-gray-500">
              by Brandguide
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Linkek</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/teszt" className="text-sm hover:text-white transition-colors">
                  Logo elemzés
                </Link>
              </li>
              <li>
                <Link href="/arak" className="text-sm hover:text-white transition-colors">
                  Árak
                </Link>
              </li>
              <li>
                <Link href="/galeria" className="text-sm hover:text-white transition-colors">
                  Logo galéria
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Jogi</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/aszf" className="text-sm hover:text-white transition-colors">
                  ÁSZF
                </Link>
              </li>
              <li>
                <Link href="/adatvedelem" className="text-sm hover:text-white transition-colors">
                  Adatvédelmi tájékoztató
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Kapcsolat</h3>
            <a
              href="mailto:peti@brandguide.hu"
              className="text-sm hover:text-white transition-colors"
            >
              peti@brandguide.hu
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Brandguide. Minden jog fenntartva.
        </div>
      </div>
    </footer>
  );
}
