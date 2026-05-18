"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExercisePicker, type Exercise } from "@/components/ExercisePicker";

interface SetRow {
  weight: string;
  reps: string;
  rpe: string;
}

interface ExerciseGroup {
  exerciseId: string;
  sets: SetRow[];
}

interface Template {
  id: string;
  name: string;
  sets: { exerciseId: string; weight: number; reps: number; rpe: number | null; order: number }[];
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

const REST_PRESETS = [60, 120, 180, 240, 300];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function todayLocalDate() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function flatSetsToGroups(
  flat: { exerciseId: string; weight: number; reps: number; rpe: number | null; order: number }[]
): ExerciseGroup[] {
  const groupMap = new Map<string, SetRow[]>();
  const orderMap = new Map<string, number>();
  for (const s of flat) {
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
  return sorted.map(([exerciseId, sets]) => ({ exerciseId, sets }));
}

function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

function notifyTimerDone() {
  if (typeof window === "undefined") return;
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification("Descanso terminado", { body: "¡A entrenar!", icon: "/icon-192.png" }); } catch {}
  }
  if ("vibrate" in navigator) {
    try { navigator.vibrate([200, 100, 200, 100, 400]); } catch {}
  }
  playBeep();
}

export default function NewSessionPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayLocalDate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [lastSession, setLastSession] = useState<{
    date: string;
    sets: { exerciseId: string; weight: number; reps: number; rpe: number | null; order: number }[];
  } | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const [restDuration, setRestDuration] = useState(180);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(restDuration);
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          notifyTimerDone();
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
    fetch("/api/sessions").then((r) => r.json()).then((sessions) => {
      if (sessions?.length > 0) setLastSession(sessions[0]);
    });
    fetch("/api/templates").then((r) => r.json()).then(setTemplates);
  }, []);

  function copyLastSession() {
    if (!lastSession) return;
    setGroups(flatSetsToGroups(lastSession.sets));
  }

  function loadTemplate(t: Template) {
    setGroups(flatSetsToGroups(t.sets));
    setShowTemplates(false);
  }

  async function saveAsTemplate() {
    if (!templateName.trim()) return;
    if (groups.length === 0) return;
    setSavingTemplate(true);
    const flatSets = groups.flatMap((g, gi) =>
      g.sets.map((s, si) => ({
        exerciseId: g.exerciseId,
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 1,
        rpe: s.rpe ? parseFloat(s.rpe) : null,
        order: gi * 100 + si,
      }))
    );
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName.trim(), sets: flatSets }),
    });
    if (res.ok) {
      const created = await res.json();
      setTemplates((prev) => [created, ...prev]);
      setShowSaveTemplate(false);
      setTemplateName("");
    }
    setSavingTemplate(false);
  }

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
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, sets: flatSets, date }),
    });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setError("Error al guardar");
      setSaving(false);
    }
  }

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
  const timerColor =
    timeLeft !== null && timeLeft <= 10 ? "text-red-400" :
    timeLeft !== null && timeLeft <= 30 ? "text-yellow-400" : "text-white";

  const volumeKg = groups.reduce((sum, g) => {
    return sum + g.sets.reduce((s, set) => {
      const w = parseFloat(set.weight);
      const r = parseInt(set.reps);
      return s + (isNaN(w) || isNaN(r) ? 0 : w * r);
    }, 0);
  }, 0);

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

      {showTemplates && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowTemplates(false)}>
          <div className="bg-gray-900 w-full rounded-t-2xl p-4 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Cargar template</h3>
              <button onClick={() => setShowTemplates(false)} className="text-gray-400 text-sm px-2 py-1">Cerrar</button>
            </div>
            {templates.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No tenés templates guardados</p>
            ) : (
              <div className="overflow-y-auto space-y-2 pb-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => loadTemplate(t)}
                    className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.sets.length} series</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showSaveTemplate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowSaveTemplate(false)}>
          <div className="bg-gray-900 w-full max-w-sm rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">Guardar como template</h3>
            <input
              autoFocus
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ej: Día A - Sentadilla"
              className="bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm w-full"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowSaveTemplate(false); setTemplateName(""); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2.5 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveAsTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
              >
                {savingTemplate ? "..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto p-4 space-y-4 pb-32">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">← Volver</button>
          <h2 className="text-2xl font-bold">Nueva sesión</h2>
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
            max={todayLocalDate()}
            className="bg-gray-900 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm w-full"
          />
        </div>

        {/* Quick-fill actions */}
        {groups.length === 0 && (lastSession || templates.length > 0) && (
          <div className="grid grid-cols-2 gap-2">
            {templates.length > 0 && (
              <button
                onClick={() => setShowTemplates(true)}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-orange-500 text-gray-300 rounded-xl px-3 py-3 text-sm transition-colors"
              >
                📋 Cargar template
              </button>
            )}
            {lastSession && (
              <button
                onClick={copyLastSession}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-orange-500 text-gray-300 rounded-xl px-3 py-3 text-sm transition-colors"
              >
                ↻ Copiar última
              </button>
            )}
          </div>
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
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  restDuration === s && !timerRunning ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400"
                }`}
              >
                {formatTime(s)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={timerRunning ? stopTimer : startTimer}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                timerRunning ? "bg-gray-700 text-white" : "bg-orange-600 hover:bg-orange-500 text-white"
              }`}
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

        {/* Exercise groups */}
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
                <button
                  onClick={() => removeGroup(gi)}
                  className="text-gray-600 hover:text-red-400 text-xs transition-colors py-1 px-2"
                >
                  Quitar
                </button>
              </div>

              <div className="px-4 pt-3 pb-4 space-y-2">
                <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1.5rem] gap-2 text-xs text-gray-500 px-1 mb-1">
                  <span>#</span>
                  <span>Peso kg</span>
                  <span>Reps</span>
                  <span>RPE</span>
                  <span />
                </div>

                {group.sets.map((s, si) => (
                  <div key={si} className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1.5rem] gap-2 items-center">
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
                ))}

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

        {volumeKg > 0 && (
          <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-gray-400">Volumen total</span>
            <span className="font-bold text-orange-400">{Math.round(volumeKg).toLocaleString("es-AR")} kg</span>
          </div>
        )}

        {groups.length > 0 && (
          <button
            onClick={() => setShowSaveTemplate(true)}
            className="w-full text-xs text-gray-400 hover:text-orange-400 py-2 transition-colors"
          >
            💾 Guardar como template
          </button>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Notas (opcional)</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={3} placeholder="Ej: Buen día, sentadilla se sintió liviana..."
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
            {saving ? "Guardando..." : "Guardar sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
