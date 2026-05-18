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

const CATEGORY_COLOR: Record<string, string> = {
  squat: "text-blue-400",
  bench: "text-green-400",
  deadlift: "text-red-400",
  accessory: "text-gray-400",
};

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
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data) => { setSessions(data); setLoading(false); });
  }, []);

  async function deleteSession(id: string) {
    if (!confirm("¿Eliminar esta sesión?")) return;
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <main className="max-w-2xl mx-auto p-6 space-y-4">
        <h2 className="text-2xl font-bold mb-6">Historial</h2>
        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">Todavía no registraste ninguna sesión</p>
            <Link
              href="/dashboard/session/new"
              className="bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl px-6 py-3 inline-block transition-colors"
            >
              Registrar primera sesión
            </Link>
          </div>
        ) : (
          sessions.map((session) => {
            const date = new Date(session.date);
            const isOpen = expanded === session.id;
            const exerciseGroups = groupSetsByExercise(session.sets);

            return (
              <div key={session.id} className="bg-gray-900 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : session.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
                >
                  <div className="text-left">
                    <div className="font-semibold">
                      {date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      {session.sets.length} series · {exerciseGroups.map((e) => e.name).join(", ")}
                    </div>
                  </div>
                  <span className="text-gray-500 text-lg">{isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                    {exerciseGroups.map((group) => (
                      <div key={group.name}>
                        <h3 className={`font-semibold text-sm mb-2 ${CATEGORY_COLOR[group.category] ?? "text-white"}`}>
                          {group.name}
                        </h3>
                        <div className="space-y-1">
                          {group.sets.map((s, i) => (
                            <div key={s.id} className="flex items-center gap-4 text-sm text-gray-300">
                              <span className="text-gray-600 w-4">{i + 1}</span>
                              <span>{s.weight} kg</span>
                              <span>×</span>
                              <span>{s.reps} reps</span>
                              {s.rpe && <span className="text-gray-500">RPE {s.rpe}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {session.notes && (
                      <p className="text-sm text-gray-400 border-t border-gray-800 pt-3 italic">{session.notes}</p>
                    )}

                    <button
                      onClick={() => deleteSession(session.id)}
                      className="text-red-400 hover:text-red-300 text-sm mt-2"
                    >
                      Eliminar sesión
                    </button>
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
