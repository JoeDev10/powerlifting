"use client";

import { useEffect, useState } from "react";

interface Block {
  id: string;
  name: string;
  phase: string;
  startDate: string;
  endDate: string;
  notes: string | null;
  createdAt: string;
}

const PHASES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  volumen:     { label: "Volumen",     color: "text-blue-400",   bg: "bg-blue-900/20",   border: "border-blue-700" },
  intensidad:  { label: "Intensidad",  color: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-700" },
  pico:        { label: "Pico",        color: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-700" },
  descarga:    { label: "Descarga",    color: "text-green-400",  bg: "bg-green-900/20",  border: "border-green-700" },
};

function todayLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function blockStatus(block: Block): "active" | "upcoming" | "past" {
  const today = todayLocal();
  const start = block.startDate.slice(0, 10);
  const end = block.endDate.slice(0, 10);
  if (today < start) return "upcoming";
  if (today > end) return "past";
  return "active";
}

function blockProgress(block: Block): number {
  const now = Date.now();
  const start = new Date(block.startDate).getTime();
  const end = new Date(block.endDate).getTime();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

function blockDays(block: Block): number {
  return Math.round((new Date(block.endDate).getTime() - new Date(block.startDate).getTime()) / (1000 * 60 * 60 * 24));
}

function daysLeft(block: Block): number {
  return Math.max(0, Math.ceil((new Date(block.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState("volumen");
  const [startDate, setStartDate] = useState(todayLocal());
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/blocks").then((r) => r.json()).then((data) => {
      setBlocks(data);
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    setError("");
    if (!name.trim() || !endDate) { setError("Completá nombre y fechas"); return; }
    if (endDate <= startDate) { setError("La fecha de fin debe ser posterior al inicio"); return; }
    setSaving(true);
    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phase, startDate, endDate, notes }),
    });
    if (res.ok) {
      const created = await res.json();
      setBlocks((prev) => [created, ...prev].sort((a, b) => b.startDate.localeCompare(a.startDate)));
      setName(""); setPhase("volumen"); setStartDate(todayLocal()); setEndDate(""); setNotes("");
      setShowForm(false);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este bloque?")) return;
    await fetch(`/api/blocks/${id}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  const active = blocks.filter((b) => blockStatus(b) === "active");
  const upcoming = blocks.filter((b) => blockStatus(b) === "upcoming");
  const past = blocks.filter((b) => blockStatus(b) === "past");

  if (loading) return <div className="flex items-center justify-center py-32"><p className="text-gray-400">Cargando...</p></div>;

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bloques</h2>
        <button
          onClick={() => setShowForm((x) => !x)}
          className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nuevo"}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <input
            autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Bloque de volumen — Enero"
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
          />
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Fase</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(PHASES).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => setPhase(key)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    phase === key ? `${p.bg} ${p.color} ${p.border}` : "bg-gray-800 text-gray-400 border-gray-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Inicio</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm" />
            </div>
          </div>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={2} placeholder="Notas (opcional)"
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm resize-none"
          />
          <button
            onClick={handleCreate} disabled={saving}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {saving ? "Guardando..." : "Crear bloque"}
          </button>
        </div>
      )}

      {blocks.length === 0 && !showForm && (
        <div className="text-center py-16 bg-gray-900 rounded-xl">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-gray-300 font-semibold mb-1">Sin bloques todavía</p>
          <p className="text-xs text-gray-500">Planificá tus mesociclos: volumen, intensidad, pico, descarga</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">En curso</p>
          {active.map((b) => {
            const p = PHASES[b.phase] ?? PHASES.volumen;
            const pct = blockProgress(b);
            const left = daysLeft(b);
            const total = blockDays(b);
            return (
              <div key={b.id} className={`rounded-xl p-4 border ${p.bg} ${p.border} space-y-3`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-xs font-semibold ${p.color} uppercase tracking-wide`}>{p.label}</span>
                    <p className="font-bold text-lg mt-0.5">{b.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(b.startDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })} →{" "}
                      {new Date(b.endDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })} · {total} días
                    </p>
                  </div>
                  <button onClick={() => handleDelete(b.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">Eliminar</button>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>{pct}% completado</span>
                    <span className={`font-semibold ${p.color}`}>{left} días restantes</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${p.bg.replace("/20", "")} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {b.notes && <p className="text-xs text-gray-400 italic">{b.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Próximos</p>
          {upcoming.map((b) => {
            const p = PHASES[b.phase] ?? PHASES.volumen;
            const daysUntil = Math.ceil((new Date(b.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <div key={b.id} className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold ${p.color}`}>{p.label}</span>
                    <span className="text-white font-medium text-sm">{b.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">Empieza en {daysUntil} días</p>
                </div>
                <button onClick={() => handleDelete(b.id)} className="text-gray-600 hover:text-red-400 text-xs">Eliminar</button>
              </div>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mt-2">Anteriores</p>
          {past.map((b) => {
            const p = PHASES[b.phase] ?? PHASES.volumen;
            return (
              <div key={b.id} className="bg-gray-900 rounded-xl p-3 flex items-center justify-between opacity-60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${p.color}`}>{p.label}</span>
                    <span className="text-white text-sm">{b.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(b.startDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })} —{" "}
                    {new Date(b.endDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })} · {blockDays(b)}d
                  </p>
                </div>
                <button onClick={() => handleDelete(b.id)} className="text-gray-600 hover:text-red-400 text-xs">Eliminar</button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
