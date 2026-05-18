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
  sets: { weight: number; reps: number; exercise: { name: string } }[];
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

  const now = new Date();
  const dayMs = 1000 * 60 * 60 * 24;

  const weekSessions = sessions.filter((s) => (now.getTime() - new Date(s.date).getTime()) <= 7 * dayMs);
  const lastWeekSessions = sessions.filter((s) => {
    const diff = (now.getTime() - new Date(s.date).getTime()) / dayMs;
    return diff > 7 && diff <= 14;
  });
  const thisWeek = weekSessions.length;
  const sumVolume = (arr: Session[]) =>
    arr.reduce((sum, s) => sum + s.sets.reduce((vs, set) => vs + set.weight * set.reps, 0), 0);
  const weekVolume = sumVolume(weekSessions);
  const lastWeekVolume = sumVolume(lastWeekSessions);
  const deltaPct = lastWeekVolume > 0 ? Math.round(((weekVolume - lastWeekVolume) / lastWeekVolume) * 100) : null;

  // Weekly streak: count consecutive weeks (Mon-Sun) with at least 1 session, looking back from this week
  function getWeekKey(d: Date) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / dayMs + 1) / 7);
    return `${date.getFullYear()}-${weekNum}`;
  }
  const sessionWeeks = new Set(sessions.map((s) => getWeekKey(new Date(s.date))));
  let streak = 0;
  const cursor = new Date(now);
  if (!sessionWeeks.has(getWeekKey(cursor))) cursor.setDate(cursor.getDate() - 7);
  while (sessionWeeks.has(getWeekKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }

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
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Esta semana</p>
              <p className="text-2xl font-bold">{thisWeek} <span className="text-sm text-gray-400 font-normal">ses.</span></p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Racha semanal</p>
              <p className="text-2xl font-bold">
                {streak > 0 ? <>{streak} <span className="text-sm text-gray-400 font-normal">sem.</span> {streak >= 3 && <span className="text-base">🔥</span>}</> : "—"}
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1.5">
                Volumen semanal
                {deltaPct !== null && weekVolume > 0 && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    deltaPct > 0 ? "bg-green-900/50 text-green-400" : deltaPct < 0 ? "bg-red-900/50 text-red-400" : "bg-gray-800 text-gray-400"
                  }`}>
                    {deltaPct > 0 ? "+" : ""}{deltaPct}%
                  </span>
                )}
              </p>
              <p className="text-2xl font-bold text-orange-400">
                {weekVolume > 0 ? Math.round(weekVolume).toLocaleString("es-AR") : "—"}
                {weekVolume > 0 && <span className="text-sm text-gray-400"> kg</span>}
              </p>
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
        <Link href="/dashboard/templates" className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors">
          <div className="text-2xl mb-2">📋</div>
          <div className="font-semibold">Templates</div>
          <div className="text-gray-400 text-xs mt-0.5">Rutinas guardadas</div>
        </Link>
        <Link href="/dashboard/bodyweight" className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors">
          <div className="text-2xl mb-2">⚖️</div>
          <div className="font-semibold">Peso corporal</div>
          <div className="text-gray-400 text-xs mt-0.5">Tracking + Wilks</div>
        </Link>
      </div>
    </main>
  );
}
