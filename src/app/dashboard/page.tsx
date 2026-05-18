"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PR {
  name: string;
  category: string;
  bestWeight: number;
  bestReps: number;
  bestOrm: number;
  date: string;
}

interface Session {
  id: string;
  date: string;
  sets: { exercise: { name: string } }[];
}

const MAIN_LIFTS = ["Sentadilla", "Press de banca", "Peso muerto"];

const CATEGORY_COLOR: Record<string, string> = {
  squat: "text-blue-400",
  bench: "text-green-400",
  deadlift: "text-red-400",
};

export default function DashboardPage() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/prs").then((r) => r.json()),
      fetch("/api/sessions").then((r) => r.json()),
    ]).then(([prsData, sessionsData]) => {
      setPrs(prsData);
      setSessions(sessionsData);
      setLoading(false);
    });
  }, []);

  const mainPrs = MAIN_LIFTS.map((name) => prs.find((p) => p.name === name)).filter(Boolean) as PR[];
  const sbd = mainPrs.reduce((acc, p) => acc + p.bestOrm, 0);
  const lastSession = sessions[0];
  const thisWeek = sessions.filter((s) => {
    const d = new Date(s.date);
    const now = new Date();
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }).length;

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Quick action */}
      <Link
        href="/dashboard/session/new"
        className="flex items-center justify-between bg-orange-600 hover:bg-orange-500 rounded-2xl p-5 transition-colors"
      >
        <div>
          <div className="font-bold text-lg">Registrar sesión</div>
          <div className="text-orange-200 text-sm">
            {lastSession
              ? `Última: ${new Date(lastSession.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}`
              : "Todavía no registraste ninguna"}
          </div>
        </div>
        <div className="text-4xl font-bold">+</div>
      </Link>

      {!loading && sessions.length > 0 && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Sesiones totales</p>
              <p className="text-2xl font-bold">{sessions.length}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Esta semana</p>
              <p className="text-2xl font-bold">{thisWeek}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Total SBD</p>
              <p className="text-2xl font-bold text-orange-400">
                {sbd > 0 ? `${Math.round(sbd)}` : "—"}
                {sbd > 0 && <span className="text-sm text-gray-400"> kg</span>}
              </p>
            </div>
          </div>

          {/* PRs de los 3 grandes */}
          {mainPrs.length > 0 && (
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <p className="font-semibold text-sm">Records personales</p>
                <Link href="/dashboard/progress" className="text-orange-400 text-xs">Ver progreso →</Link>
              </div>
              <div className="divide-y divide-gray-800">
                {mainPrs.map((pr) => (
                  <div key={pr.name} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className={`font-medium text-sm ${CATEGORY_COLOR[pr.category] ?? "text-white"}`}>{pr.name}</p>
                      <p className="text-xs text-gray-500">{pr.bestWeight} kg × {pr.bestReps} reps</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{pr.bestOrm} <span className="text-sm text-gray-400">kg</span></p>
                      <p className="text-xs text-gray-500">1RM est.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last session */}
          {lastSession && (
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <p className="font-semibold text-sm">Última sesión</p>
                <Link href="/dashboard/history" className="text-orange-400 text-xs">Ver historial →</Link>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-gray-400 mb-2">
                  {new Date(lastSession.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(lastSession.sets.map((s) => s.exercise.name))].map((name) => (
                    <span key={name} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-lg">{name}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Nav grid */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/history" className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors">
          <div className="text-2xl mb-2">📋</div>
          <div className="font-semibold">Historial</div>
          <div className="text-gray-400 text-xs mt-0.5">Ver sesiones anteriores</div>
        </Link>
        <Link href="/dashboard/progress" className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors">
          <div className="text-2xl mb-2">📈</div>
          <div className="font-semibold">Progreso</div>
          <div className="text-gray-400 text-xs mt-0.5">Evolución de 1RM</div>
        </Link>
        <Link href="/dashboard/calculators" className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors">
          <div className="text-2xl mb-2">🧮</div>
          <div className="font-semibold">Calculadoras</div>
          <div className="text-gray-400 text-xs mt-0.5">1RM · Wilks · IPF · Discos</div>
        </Link>
        <Link href="/dashboard/session/new" className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors">
          <div className="text-2xl mb-2">⚡</div>
          <div className="font-semibold">Nueva sesión</div>
          <div className="text-gray-400 text-xs mt-0.5">Registrar entrenamiento</div>
        </Link>
      </div>
    </main>
  );
}
