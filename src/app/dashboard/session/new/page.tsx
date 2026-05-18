"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Exercise {
  id: string;
  name: string;
  category: string;
}

interface SetEntry {
  exerciseId: string;
  weight: string;
  reps: string;
  rpe: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  squat: "Sentadilla",
  bench: "Press banca",
  deadlift: "Peso muerto",
  accessory: "Accesorios",
};

export default function NewSessionPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sets, setSets] = useState<SetEntry[]>([{ exerciseId: "", weight: "", reps: "", rpe: "" }]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/exercises").then((r) => r.json()).then(setExercises);
  }, []);

  function addSet() {
    setSets((prev) => [...prev, { exerciseId: prev[prev.length - 1]?.exerciseId ?? "", weight: "", reps: "", rpe: "" }]);
  }

  function removeSet(i: number) {
    setSets((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateSet(i: number, field: keyof SetEntry, value: string) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  async function handleSave() {
    setError("");
    for (const s of sets) {
      if (!s.exerciseId || !s.weight || !s.reps) {
        setError("Completá ejercicio, peso y reps en todas las series");
        return;
      }
    }
    setSaving(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes,
        sets: sets.map((s, i) => ({
          exerciseId: s.exerciseId,
          weight: parseFloat(s.weight),
          reps: parseInt(s.reps),
          rpe: s.rpe ? parseFloat(s.rpe) : null,
          order: i,
        })),
      }),
    });

    if (res.ok) {
      router.push("/dashboard/history");
    } else {
      setError("Error al guardar");
      setSaving(false);
    }
  }

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.category] ??= []).push(ex);
    return acc;
  }, {});

  return (
    <div>
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">← Volver</button>
          <h2 className="text-2xl font-bold">Nueva sesión</h2>
        </div>
        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div className="space-y-3">
          {sets.map((s, i) => (
            <div key={i} className="bg-gray-900 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Serie {i + 1}</span>
                {sets.length > 1 && (
                  <button onClick={() => removeSet(i)} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
                )}
              </div>

              <select
                value={s.exerciseId}
                onChange={(e) => updateSet(i, "exerciseId", e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
              >
                <option value="">— Seleccionar ejercicio —</option>
                {Object.entries(grouped).map(([cat, exs]) => (
                  <optgroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
                    {exs.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={s.weight}
                    onChange={(e) => updateSet(i, "weight", e.target.value)}
                    placeholder="100"
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Reps</label>
                  <input
                    type="number"
                    min="1"
                    value={s.reps}
                    onChange={(e) => updateSet(i, "reps", e.target.value)}
                    placeholder="5"
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">RPE (opc.)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={s.rpe}
                    onChange={(e) => updateSet(i, "rpe", e.target.value)}
                    placeholder="8"
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addSet}
          className="w-full border border-dashed border-gray-600 hover:border-orange-500 text-gray-400 hover:text-orange-400 rounded-xl py-3 text-sm transition-colors"
        >
          + Agregar serie
        </button>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ej: Buen día, sentadilla se sintió liviana..."
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
        >
          {saving ? "Guardando..." : "Guardar sesión"}
        </button>
      </main>
    </div>
  );
}
