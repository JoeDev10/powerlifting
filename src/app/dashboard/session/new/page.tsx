"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

const REST_PRESETS = [60, 120, 180, 240, 300];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function NewSessionPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sets, setSets] = useState<SetEntry[]>([{ exerciseId: "", weight: "", reps: "", rpe: "" }]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Timer
  const [restDuration, setRestDuration] = useState(180);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(restDuration);
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [restDuration]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimeLeft(null);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  useEffect(() => {
    fetch("/api/exercises").then((r) => r.json()).then(setExercises);
    // Load last session to offer copy
    fetch("/api/sessions").then((r) => r.json()).then((sessions) => {
      if (sessions?.length > 0) {
        const last = sessions[0];
        const offer = window.confirm(
          `¿Querés copiar la última sesión (${new Date(last.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })})?`
        );
        if (offer) {
          setSets(
            last.sets.map((s: { exerciseId: string; weight: number; reps: number; rpe: number | null }) => ({
              exerciseId: s.exerciseId,
              weight: String(s.weight),
              reps: String(s.reps),
              rpe: s.rpe != null ? String(s.rpe) : "",
            }))
          );
        }
      }
    });
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

  function duplicateSet(i: number) {
    setSets((prev) => {
      const copy = { ...prev[i] };
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
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
      router.push("/dashboard");
    } else {
      setError("Error al guardar");
      setSaving(false);
    }
  }

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.category] ??= []).push(ex);
    return acc;
  }, {});

  const timerColor = timeLeft !== null && timeLeft <= 10 ? "text-red-400" : timeLeft !== null && timeLeft <= 30 ? "text-yellow-400" : "text-white";

  return (
    <div>
      <main className="max-w-2xl mx-auto p-4 space-y-5 pb-32">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">← Volver</button>
          <h2 className="text-2xl font-bold">Nueva sesión</h2>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Rest Timer */}
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-300">Timer de descanso</p>
            <span className={`text-2xl font-mono font-bold ${timerColor}`}>
              {timeLeft !== null ? formatTime(timeLeft) : formatTime(restDuration)}
            </span>
          </div>
          <div className="flex gap-2 mb-3 flex-wrap">
            {REST_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => { setRestDuration(s); stopTimer(); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${restDuration === s && !timerRunning ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400"}`}
              >
                {formatTime(s)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={timerRunning ? stopTimer : startTimer}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${timerRunning ? "bg-gray-700 text-white" : "bg-orange-600 hover:bg-orange-500 text-white"}`}
            >
              {timerRunning ? "⏹ Detener" : "▶ Iniciar"}
            </button>
            {timeLeft !== null && (
              <button onClick={startTimer} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors">
                ↺ Reset
              </button>
            )}
          </div>
        </div>

        {/* Sets */}
        <div className="space-y-3">
          {sets.map((s, i) => (
            <div key={i} className="bg-gray-900 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Serie {i + 1}</span>
                <div className="flex gap-3">
                  <button onClick={() => duplicateSet(i)} className="text-gray-500 hover:text-gray-300 text-xs">Duplicar</button>
                  {sets.length > 1 && (
                    <button onClick={() => removeSet(i)} className="text-red-400 hover:text-red-300 text-xs">Eliminar</button>
                  )}
                </div>
              </div>

              <select
                value={s.exerciseId}
                onChange={(e) => updateSet(i, "exerciseId", e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Peso (kg)</label>
                  <input
                    type="number" inputMode="decimal" min="0" step="0.5"
                    value={s.weight} onChange={(e) => updateSet(i, "weight", e.target.value)}
                    placeholder="100"
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Reps</label>
                  <input
                    type="number" inputMode="numeric" min="1"
                    value={s.reps} onChange={(e) => updateSet(i, "reps", e.target.value)}
                    placeholder="5"
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">RPE</label>
                  <input
                    type="number" inputMode="decimal" min="1" max="10" step="0.5"
                    value={s.rpe} onChange={(e) => updateSet(i, "rpe", e.target.value)}
                    placeholder="8"
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
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
            value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={3} placeholder="Ej: Buen día, sentadilla se sintió liviana..."
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm resize-none"
          />
        </div>
      </main>

      {/* Sticky save button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 backdrop-blur border-t border-gray-800">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSave} disabled={saving}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 transition-colors"
          >
            {saving ? "Guardando..." : "Guardar sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
