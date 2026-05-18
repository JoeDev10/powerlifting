"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Entry {
  id: string;
  weight: number;
  date: string;
  notes: string | null;
}

function todayLocalDate() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export default function BodyWeightPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayLocalDate());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/bodyweight").then((r) => r.json()).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  async function addEntry() {
    setError("");
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) { setError("Peso inválido"); return; }
    setSaving(true);
    const res = await fetch("/api/bodyweight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: w, date, notes }),
    });
    if (res.ok) {
      const created = await res.json();
      setEntries((prev) => [created, ...prev].sort((a, b) => +new Date(b.date) - +new Date(a.date)));
      setWeight(""); setNotes(""); setDate(todayLocalDate());
    } else {
      setError("Error al guardar");
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    if (!confirm("¿Eliminar registro?")) return;
    await fetch(`/api/bodyweight/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const chartData = [...entries]
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .map((e) => ({
      date: new Date(e.date).toLocaleDateString("es-AR", { day: "numeric", month: "short" }),
      weight: e.weight,
    }));

  const current = entries[0]?.weight ?? null;
  const oldest = entries[entries.length - 1]?.weight ?? null;
  const delta = current && oldest ? current - oldest : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-5">
      <h2 className="text-2xl font-bold">Peso corporal</h2>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Actual</p>
            <p className="text-2xl font-bold">{current?.toFixed(1)}<span className="text-sm text-gray-400"> kg</span></p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Inicial</p>
            <p className="text-2xl font-bold text-gray-300">{oldest?.toFixed(1)}<span className="text-sm text-gray-400"> kg</span></p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Cambio</p>
            <p className={`text-2xl font-bold ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-gray-300"}`}>
              {delta > 0 ? "+" : ""}{delta.toFixed(1)}<span className="text-sm text-gray-400"> kg</span>
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="bg-gray-900 rounded-xl p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="weight" stroke="#ea580c" strokeWidth={2} dot={{ fill: "#ea580c", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add form */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-3">
        <p className="font-semibold text-sm">Nuevo registro</p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Peso (kg)</label>
            <input
              type="number" inputMode="decimal" min="0" step="0.1"
              value={weight} onChange={(e) => setWeight(e.target.value)}
              placeholder="83.5"
              className="bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Fecha</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              max={todayLocalDate()}
              className="bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm w-full"
            />
          </div>
        </div>
        <input
          type="text"
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (opcional)"
          className="bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm w-full"
        />
        <button
          onClick={addEntry} disabled={saving || !weight}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {saving ? "Guardando..." : "Agregar"}
        </button>
      </div>

      {/* History */}
      {entries.length > 0 && (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <p className="px-4 py-3 border-b border-gray-800 font-semibold text-sm">Historial</p>
          <div className="divide-y divide-gray-800">
            {entries.map((e) => (
              <div key={e.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{e.weight.toFixed(1)} <span className="text-xs text-gray-400">kg</span></p>
                  <p className="text-xs text-gray-500">
                    {new Date(e.date).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    {e.notes && <span className="italic ml-2">— {e.notes}</span>}
                  </p>
                </div>
                <button onClick={() => deleteEntry(e.id)} className="text-red-400 hover:text-red-300 text-xs">
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
