"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SetItem {
  id: string;
  weight: number;
  reps: number;
  rpe: number | null;
  exercise: { name: string; category: string };
}

interface Session {
  id: string;
  date: string;
  notes: string | null;
  sets: SetItem[];
}

interface PR {
  name: string;
  bestWeight: number;
  bestReps: number;
  bestOrm: number;
}

const CATEGORY_COLOR: Record<string, string> = {
  squat: "text-blue-400",
  bench: "text-green-400",
  deadlift: "text-red-400",
  accessory: "text-gray-400",
};

function epley(w: number, r: number) { return r === 1 ? w : w * (1 + r / 30); }

function groupSetsByExercise(sets: SetItem[]) {
  const map = new Map<string, { name: string; category: string; sets: SetItem[] }>();
  for (const s of sets) {
    const key = s.exercise.name;
    if (!map.has(key)) map.set(key, { name: s.exercise.name, category: s.exercise.category, sets: [] });
    map.get(key)!.sets.push(s);
  }
  return Array.from(map.values());
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/sessions").then((r) => r.json()),
      fetch("/api/prs").then((r) => r.json()),
    ]).then(([s, p]) => {
      setSessions(s);
      setPrs(p);
      setLoading(false);
    });
  }, []);

  async function deleteSession(id: string) {
    if (!confirm("¿Eliminar esta sesión?")) return;
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  function isPR(exerciseName: string, weight: number, reps: number) {
    const pr = prs.find((p) => p.name === exerciseName);
    if (!pr) return false;
    return epley(weight, reps) >= pr.bestOrm;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        <h2 className="text-2xl font-bold mb-6">Historial</h2>

        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">Todavía no registraste ninguna sesión</p>
            <Link href="/dashboard/session/new"
              className="bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl px-6 py-3 inline-block transition-colors">
              Registrar primera sesión
            </Link>
          </div>
        ) : (
          sessions.map((session) => {
            const date = new Date(session.date);
            const isOpen = expanded === session.id;
            const exerciseGroups = groupSetsByExercise(session.sets);
            const hasPRs = session.sets.some((s) => isPR(s.exercise.name, s.weight, s.reps));

            return (
              <div key={session.id} className="bg-gray-900 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : session.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                >
                  <div className="text-left">
                    <div className="font-semibold flex items-center gap-2">
                      {date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                      {hasPRs && (
                        <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">🏆 PR</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      {session.sets.length} series · {exerciseGroups.map((e) => e.name).join(", ")}
                    </div>
                  </div>
                  <span className="text-gray-500 ml-2">{isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                    {exerciseGroups.map((group) => (
                      <div key={group.name}>
                        <h3 className={`font-semibold text-sm mb-2 ${CATEGORY_COLOR[group.category] ?? "text-white"}`}>
                          {group.name}
                        </h3>
                        <div className="space-y-1.5">
                          {group.sets.map((s, i) => {
                            const pr = isPR(s.exercise.name, s.weight, s.reps);
                            return (
                              <div key={s.id} className={`flex items-center gap-3 text-sm ${pr ? "text-yellow-300" : "text-gray-300"}`}>
                                <span className="text-gray-600 w-4">{i + 1}</span>
                                <span className="font-medium">{s.weight} kg</span>
                                <span className="text-gray-500">×</span>
                                <span>{s.reps} reps</span>
                                {s.rpe && <span className="text-gray-500">RPE {s.rpe}</span>}
                                {pr && <span className="text-yellow-400 text-xs">🏆 PR</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {session.notes && (
                      <p className="text-sm text-gray-400 border-t border-gray-800 pt-3 italic">{session.notes}</p>
                    )}

                    <div className="flex gap-3 pt-1 border-t border-gray-800">
                      <Link href={`/dashboard/session/${session.id}`}
                        className="text-orange-400 hover:text-orange-300 text-sm font-medium">
                        Editar
                      </Link>
                      <button onClick={() => deleteSession(session.id)}
                        className="text-red-400 hover:text-red-300 text-sm">
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
