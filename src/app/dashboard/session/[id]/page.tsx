"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ExercisePicker, type Exercise } from "@/components/ExercisePicker";
import PlateChips from "@/components/PlateChips";

interface SetRow {
  weight: string;
  reps: string;
  rpe: string;
}

interface ExerciseGroup {
  exerciseId: string;
  sets: SetRow[];
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

function toLocalDate(iso: string) {
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export default function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/exercises").then((r) => r.json()),
      fetch(`/api/sessions/${id}`).then((r) => r.json()),
    ]).then(([exs, session]) => {
      setExercises(exs);
      const groupMap = new Map<string, SetRow[]>();
      const orderMap = new Map<string, number>();
      for (const s of session.sets as { exerciseId: string; weight: number; reps: number; rpe: number | null; order: number }[]) {
        if (!groupMap.has(s.exerciseId)) {
          groupMap.set(s.exerciseId, []);
          orderMap.set(s.exerciseId, s.order);
        }
        groupMap.get(s.exerciseId)!.push({
          weight: String(s.weight),
          reps: String(s.reps),
          rpe: s.rpe != null ? String(s.rpe) : "",
        });
      }
      const sorted = Array.from(groupMap.entries()).sort(
        (a, b) => (orderMap.get(a[0]) ?? 0) - (orderMap.get(b[0]) ?? 0)
      );
      setGroups(sorted.map(([exerciseId, sets]) => ({ exerciseId, sets })));
      setNotes(session.notes ?? "");
      setDate(toLocalDate(session.date));
      setLoading(false);
    });
  }, [id]);

  function addExercise(exerciseId: string) {
    setGroups((prev) => [...prev, { exerciseId, sets: [{ weight: "", reps: "", rpe: "" }] }]);
    setShowPicker(false);
  }

  function handleExerciseCreated(ex: Exercise) {
    setExercises((prev) => [...prev, ex].sort((a, b) => a.name.localeCompare(b.name)));
  }

  function removeGroup(gi: number) {
    setGroups((prev) => prev.filter((_, i) => i !== gi));
  }

  function moveGroup(from: number, dir: -1 | 1) {
    setGroups((prev) => {
      const to = from + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function addSet(gi: number) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const last = g.sets[g.sets.length - 1];
        return { ...g, sets: [...g.sets, { weight: last?.weight ?? "", reps: last?.reps ?? "", rpe: "" }] };
      })
    );
  }

  function removeSet(gi: number, si: number) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const newSets = g.sets.filter((_, j) => j !== si);
        return { ...g, sets: newSets.length > 0 ? newSets : g.sets };
      })
    );
  }

  function updateSet(gi: number, si: number, field: keyof SetRow, value: string) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i !== gi ? g : { ...g, sets: g.sets.map((s, j) => (j !== si ? s : { ...s, [field]: value })) }
      )
    );
  }

  async function handleSave() {
    setError("");
    if (groups.length === 0) { setError("Agregá al menos un ejercicio"); return; }
    for (const g of groups) {
      for (const s of g.sets) {
        if (!s.weight || !s.reps) { setError("Completá peso y reps en todas las series"); return; }
      }
    }
    setSaving(true);
    const flatSets = groups.flatMap((g, gi) =>
      g.sets.map((s, si) => ({
        exerciseId: g.exerciseId,
        weight: parseFloat(s.weight),
        reps: parseInt(s.reps),
        rpe: s.rpe ? parseFloat(s.rpe) : null,
        order: gi * 100 + si,
      }))
    );
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, sets: flatSets, date }),
    });
    if (res.ok) {
      router.push("/dashboard/history");
    } else {
      setError("Error al guardar");
      setSaving(false);
    }
  }

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
          onCreated={handleExerciseCreated}
        />
      )}

      <main className="max-w-2xl mx-auto p-4 space-y-4 pb-32">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">← Volver</button>
          <h2 className="text-2xl font-bold">Editar sesión</h2>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Fecha del entrenamiento</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-gray-900 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm w-full"
          />
        </div>

        {groups.map((group, gi) => {
          const ex = exerciseMap.get(group.exerciseId);
          return (
            <div key={gi} className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div>
                  <p className={`font-semibold ${CATEGORY_COLOR[ex?.category ?? ""] ?? "text-white"}`}>
                    {ex?.name ?? "Ejercicio"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{CATEGORY_LABELS[ex?.category ?? ""] ?? ""}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveGroup(gi, -1)} disabled={gi === 0}
                    className="text-gray-600 hover:text-orange-400 disabled:opacity-20 disabled:hover:text-gray-600 text-base px-2 py-1 transition-colors"
                    aria-label="Mover arriba"
                  >↑</button>
                  <button
                    onClick={() => moveGroup(gi, 1)} disabled={gi === groups.length - 1}
                    className="text-gray-600 hover:text-orange-400 disabled:opacity-20 disabled:hover:text-gray-600 text-base px-2 py-1 transition-colors"
                    aria-label="Mover abajo"
                  >↓</button>
                  <button
                    onClick={() => removeGroup(gi)}
                    className="text-gray-600 hover:text-red-400 text-xs transition-colors py-1 px-2 ml-1"
                  >
                    Quitar
                  </button>
                </div>
              </div>

              <div className="px-4 pt-3 pb-4 space-y-2">
                <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1.5rem] gap-2 text-xs text-gray-500 px-1 mb-1">
                  <span>#</span>
                  <span>Peso kg</span>
                  <span>Reps</span>
                  <span>RPE</span>
                  <span />
                </div>

                {group.sets.map((s, si) => {
                  const w = parseFloat(s.weight);
                  return (
                    <div key={si} className="space-y-1">
                      <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1.5rem] gap-2 items-center">
                        <span className="text-xs text-gray-600 text-center">{si + 1}</span>
                        <input
                          type="number" inputMode="decimal" min="0" step="0.5"
                          value={s.weight} onChange={(e) => updateSet(gi, si, "weight", e.target.value)}
                          placeholder="100"
                          className="bg-gray-800 text-white rounded-lg px-2 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm text-center"
                        />
                        <input
                          type="number" inputMode="numeric" min="1"
                          value={s.reps} onChange={(e) => updateSet(gi, si, "reps", e.target.value)}
                          placeholder="5"
                          className="bg-gray-800 text-white rounded-lg px-2 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm text-center"
                        />
                        <input
                          type="number" inputMode="decimal" min="1" max="10" step="0.5"
                          value={s.rpe} onChange={(e) => updateSet(gi, si, "rpe", e.target.value)}
                          placeholder="–"
                          className="bg-gray-800 text-white rounded-lg px-2 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm text-center"
                        />
                        {group.sets.length > 1 ? (
                          <button
                            onClick={() => removeSet(gi, si)}
                            className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors text-center"
                          >
                            ×
                          </button>
                        ) : <span />}
                      </div>
                      {!isNaN(w) && w >= 20 && (
                        <div className="pl-8 pr-2">
                          <PlateChips weight={w} />
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => addSet(gi)}
                  className="w-full text-sm text-gray-500 hover:text-orange-400 py-2 transition-colors border border-dashed border-gray-800 hover:border-orange-500/40 rounded-lg mt-1"
                >
                  + Serie
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => setShowPicker(true)}
          className="w-full border-2 border-dashed border-gray-700 hover:border-orange-500 text-gray-400 hover:text-orange-400 rounded-xl py-4 text-sm font-medium transition-colors"
        >
          + Agregar ejercicio
        </button>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Notas</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm resize-none"
          />
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 backdrop-blur border-t border-gray-800">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSave} disabled={saving}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 transition-colors"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
