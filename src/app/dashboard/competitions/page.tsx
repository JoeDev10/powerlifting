"use client";

import { useEffect, useState } from "react";

interface Competition {
  id: string;
  name: string;
  date: string;
  weightClass: number | null;
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
  total: number | null;
  notes: string | null;
}

interface PR {
  name: string;
  category: string;
  bestOrm: number;
}

function todayLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function wilks(bw: number, total: number) {
  const a = [-220.4, 4.5, -0.019, 0.0001, -0.000001, 0.0000000002];
  const coef = 600 / (a[0] + a[1]*bw + a[2]*bw**2 + a[3]*bw**3 + a[4]*bw**4 + a[5]*bw**5);
  return Math.round(total * coef * 10) / 10;
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [weightClass, setWeightClass] = useState("");
  const [squat, setSquat] = useState("");
  const [bench, setBench] = useState("");
  const [deadlift, setDeadlift] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/competitions").then((r) => r.json()),
      fetch("/api/prs").then((r) => r.json()),
    ]).then(([comps, prsData]) => {
      setCompetitions(comps);
      setPrs(prsData);
      setLoading(false);
    });
  }, []);

  const trainingPRs: Record<string, number> = {
    squat: prs.find((p) => p.name === "Sentadilla")?.bestOrm ?? 0,
    bench: prs.find((p) => p.name === "Press de banca")?.bestOrm ?? 0,
    deadlift: prs.find((p) => p.name === "Peso muerto")?.bestOrm ?? 0,
  };

  async function handleCreate() {
    setError("");
    if (!name.trim() || !date) { setError("Completá nombre y fecha"); return; }
    setSaving(true);
    const res = await fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), date, weightClass, squat, bench, deadlift, notes }),
    });
    if (res.ok) {
      const created = await res.json();
      setCompetitions((prev) => [created, ...prev]);
      setName(""); setDate(todayLocal()); setWeightClass(""); setSquat(""); setBench("");
      setDeadlift(""); setNotes(""); setShowForm(false);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta competencia?")) return;
    await fetch(`/api/competitions/${id}`, { method: "DELETE" });
    setCompetitions((prev) => prev.filter((c) => c.id !== id));
  }

  function delta(comp: number | null, training: number) {
    if (!comp || !training) return null;
    return comp - training;
  }

  if (loading) return <div className="flex items-center justify-center py-32"><p className="text-gray-400">Cargando...</p></div>;

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Competencias</h2>
        <button
          onClick={() => setShowForm((x) => !x)}
          className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Registrar"}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <input
            autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la competencia"
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayLocal()}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Categoría de peso (kg)</label>
              <input type="number" inputMode="decimal" value={weightClass} onChange={(e) => setWeightClass(e.target.value)}
                placeholder="Ej: 83"
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Sentadilla", value: squat, set: setSquat },
              { label: "Press banca", value: bench, set: setBench },
              { label: "Peso muerto", value: deadlift, set: setDeadlift },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-xs text-gray-400 mb-1.5">{label} (kg)</label>
                <input type="number" inputMode="decimal" value={value} onChange={(e) => set(e.target.value)}
                  placeholder="—"
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm text-center" />
              </div>
            ))}
          </div>
          {squat && bench && deadlift && (
            <p className="text-center text-sm text-gray-400">
              Total: <span className="text-orange-400 font-bold">{parseFloat(squat) + parseFloat(bench) + parseFloat(deadlift)} kg</span>
              {weightClass && (
                <span className="ml-2">· Wilks: <span className="text-orange-400 font-bold">
                  {wilks(parseFloat(weightClass), parseFloat(squat) + parseFloat(bench) + parseFloat(deadlift))}
                </span></span>
              )}
            </p>
          )}
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={2} placeholder="Notas (opcional)"
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm resize-none"
          />
          <button
            onClick={handleCreate} disabled={saving}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      )}

      {competitions.length === 0 && !showForm && (
        <div className="text-center py-16 bg-gray-900 rounded-xl">
          <p className="text-3xl mb-3">🏆</p>
          <p className="text-gray-300 font-semibold mb-1">Sin competencias registradas</p>
          <p className="text-xs text-gray-500">Registrá tus totales de competencia y compará con tus PRs de entrenamiento</p>
        </div>
      )}

      {/* PRs de entrenamiento como referencia */}
      {competitions.length > 0 && (trainingPRs.squat > 0 || trainingPRs.bench > 0 || trainingPRs.deadlift > 0) && (
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">PRs de entrenamiento (referencia)</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Sent.", key: "squat", color: "text-blue-400" },
              { label: "Banca", key: "bench", color: "text-green-400" },
              { label: "P.Muerto", key: "deadlift", color: "text-red-400" },
            ].map(({ label, key, color }) => (
              <div key={key}>
                <p className={`text-xs font-semibold ${color}`}>{label}</p>
                <p className="text-lg font-bold">{trainingPRs[key] > 0 ? `${trainingPRs[key]}` : "—"} <span className="text-xs text-gray-500">kg</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {competitions.map((c) => {
          const total = c.total ?? (c.squat && c.bench && c.deadlift ? c.squat + c.bench + c.deadlift : null);
          const w = c.weightClass && total ? wilks(c.weightClass, total) : null;
          const dS = delta(c.squat, trainingPRs.squat);
          const dB = delta(c.bench, trainingPRs.bench);
          const dD = delta(c.deadlift, trainingPRs.deadlift);
          return (
            <div key={c.id} className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(c.date).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                    {c.weightClass && ` · Cat. ${c.weightClass} kg`}
                  </p>
                </div>
                <button onClick={() => handleDelete(c.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">Eliminar</button>
              </div>
              <div className="px-4 py-3">
                <div className="grid grid-cols-4 gap-2 text-center mb-3">
                  {[
                    { label: "Sent.", value: c.squat, d: dS, color: "text-blue-400" },
                    { label: "Banca", value: c.bench, d: dB, color: "text-green-400" },
                    { label: "P.Muerto", value: c.deadlift, d: dD, color: "text-red-400" },
                    { label: "Total", value: total, d: null, color: "text-orange-400" },
                  ].map(({ label, value, d, color }) => (
                    <div key={label}>
                      <p className={`text-xs font-semibold ${color}`}>{label}</p>
                      <p className="text-base font-bold">{value ?? "—"} {value && <span className="text-xs text-gray-500">kg</span>}</p>
                      {d !== null && value && (
                        <p className={`text-[10px] font-medium ${d >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {d >= 0 ? "+" : ""}{d.toFixed(1)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {w && (
                  <p className="text-center text-xs text-gray-400">
                    Wilks: <span className="font-bold text-white">{w}</span>
                  </p>
                )}
                {c.notes && <p className="text-xs text-gray-500 mt-2 italic">{c.notes}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
