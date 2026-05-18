"use client";

import { useEffect, useState } from "react";

interface Exercise {
  id: string;
  name: string;
  category: string;
}

interface Goal {
  id: string;
  exerciseId: string;
  exercise: { name: string; category: string };
  targetWeight: number;
  targetDate: string | null;
  startWeight: number | null;
  achievedAt: string | null;
  createdAt: string;
  currentOrm: number;
  progressPct: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  squat: "Sentadilla",
  bench: "Press banca",
  deadlift: "Peso muerto",
  accessory: "Accesorios",
};

const CATEGORY_COLOR: Record<string, string> = {
  squat: "text-blue-400",
  bench: "text-green-400",
  deadlift: "text-red-400",
  accessory: "text-gray-400",
};

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function GoalsPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [exerciseId, setExerciseId] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/exercises").then((r) => r.json()),
      fetch("/api/goals").then((r) => r.json()),
    ]).then(([exs, gs]) => {
      setExercises(exs);
      setGoals(gs);
      setLoading(false);
    });
  }, []);

  async function createGoal() {
    setError("");
    if (!exerciseId || !target) { setError("Completá ejercicio y peso objetivo"); return; }
    setSaving(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId, targetWeight: target, targetDate: date || null }),
    });
    if (res.ok) {
      const created = await res.json();
      setGoals((prev) => [...prev, { ...created, currentOrm: created.startWeight ?? 0, progressPct: 0 }]);
      setExerciseId(""); setTarget(""); setDate(""); setShowForm(false);
    } else {
      setError("Error al crear");
    }
    setSaving(false);
  }

  async function deleteGoal(id: string) {
    if (!confirm("¿Eliminar meta?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  async function toggleAchieved(g: Goal) {
    const achieved = !g.achievedAt;
    const res = await fetch(`/api/goals/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ achieved }),
    });
    if (res.ok) {
      const updated = await res.json();
      setGoals((prev) => prev.map((x) => x.id === g.id ? { ...x, achievedAt: updated.achievedAt } : x));
    }
  }

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.category] ??= []).push(ex);
    return acc;
  }, {});

  const active = goals.filter((g) => !g.achievedAt);
  const achieved = goals.filter((g) => g.achievedAt);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><p className="text-gray-400">Cargando...</p></div>;
  }

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Metas</h2>
        <button
          onClick={() => setShowForm((x) => !x)}
          className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nueva"}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Ejercicio</label>
            <select
              value={exerciseId}
              onChange={(e) => setExerciseId(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
            >
              <option value="">— Elegir —</option>
              {Object.entries(grouped).map(([cat, exs]) => (
                <optgroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
                  {exs.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">1RM objetivo (kg)</label>
              <input
                type="number" inputMode="decimal" min="0" step="0.5"
                value={target} onChange={(e) => setTarget(e.target.value)} placeholder="200"
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Fecha (opcional)</label>
              <input
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
              />
            </div>
          </div>
          <button
            onClick={createGoal} disabled={saving}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {saving ? "Guardando..." : "Crear meta"}
          </button>
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <div className="text-center py-16 bg-gray-900 rounded-xl">
          <p className="text-gray-500 mb-2">No tenés metas todavía</p>
          <p className="text-xs text-gray-600">Fijá un objetivo de 1RM y trackeá tu progreso</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Activas</p>
          {active.map((g) => {
            const days = daysUntil(g.targetDate);
            const remaining = g.targetWeight - g.currentOrm;
            return (
              <div key={g.id} className="bg-gray-900 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-semibold ${CATEGORY_COLOR[g.exercise.category] ?? "text-white"}`}>
                      {g.exercise.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Objetivo: <span className="text-white font-medium">{g.targetWeight} kg</span>
                      {g.targetDate && days !== null && (
                        <span className={`ml-2 ${days < 14 ? "text-yellow-400" : days < 0 ? "text-red-400" : "text-gray-400"}`}>
                          · {days < 0 ? `${-days} días vencido` : `${days} días restantes`}
                        </span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => deleteGoal(g.id)} className="text-gray-600 hover:text-red-400 text-xs">
                    Eliminar
                  </button>
                </div>

                <div>
                  <div className="flex items-end justify-between mb-1.5">
                    <p className="text-xs text-gray-400">
                      Actual: <span className="text-white font-semibold">{g.currentOrm} kg</span>
                      {remaining > 0 && <span className="text-gray-500 ml-2">faltan {remaining.toFixed(1)} kg</span>}
                    </p>
                    <p className="text-sm font-bold text-orange-400">{g.progressPct}%</p>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all"
                      style={{ width: `${g.progressPct}%` }}
                    />
                  </div>
                </div>

                {g.progressPct >= 100 && (
                  <button
                    onClick={() => toggleAchieved(g)}
                    className="w-full bg-green-700/30 hover:bg-green-700/50 border border-green-700 text-green-300 text-sm font-medium rounded-lg py-2 transition-colors"
                  >
                    🏆 Marcar como cumplida
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {achieved.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mt-6">Cumplidas</p>
          {achieved.map((g) => (
            <div key={g.id} className="bg-gray-900 rounded-xl p-3 flex items-center justify-between opacity-75">
              <div>
                <p className={`text-sm font-medium ${CATEGORY_COLOR[g.exercise.category] ?? "text-white"}`}>
                  🏆 {g.exercise.name} · {g.targetWeight} kg
                </p>
                <p className="text-xs text-gray-500">
                  Cumplida el {new Date(g.achievedAt!).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleAchieved(g)} className="text-gray-600 hover:text-gray-400 text-xs">Reabrir</button>
                <button onClick={() => deleteGoal(g.id)} className="text-gray-600 hover:text-red-400 text-xs">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
