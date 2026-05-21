"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavbarProps {
  userName?: string | null;
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/history", label: "Historial" },
  { href: "/dashboard/progress", label: "Progreso" },
  { href: "/dashboard/goals", label: "Metas" },
  { href: "/dashboard/stats", label: "Stats" },
  { href: "/dashboard/templates", label: "Templates" },
  { href: "/dashboard/bodyweight", label: "Peso" },
  { href: "/dashboard/calculators", label: "Calc" },
];

const MOBILE_NAV_LINKS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/history", label: "Historial" },
  { href: "/dashboard/progress", label: "Progreso" },
  { href: "/dashboard/calculators", label: "Calc" },
];

export default function Navbar({ userName }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-orange-500 font-bold text-lg tracking-tight">
            PowerTrack
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  pathname === href
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {userName && (
            <Link
              href="/dashboard/profile"
              className="text-gray-500 text-sm hidden sm:block hover:text-gray-300 transition-colors"
            >
              {userName}
            </Link>
          )}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("powertrack:start-tour"))}
            className="w-6 h-6 rounded-full border border-gray-700 text-gray-400 hover:text-orange-400 hover:border-orange-400 text-xs font-bold transition-colors flex items-center justify-center"
            title="Tour de la app"
          >
            ?
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="sm:hidden flex border-t border-gray-800">
        {MOBILE_NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 py-2 text-center text-xs transition-colors ${
              pathname === href ? "text-orange-400 border-b-2 border-orange-500" : "text-gray-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
