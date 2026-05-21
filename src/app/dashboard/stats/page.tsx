"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Stats {
  totalSets: number;
  totalVolume: number;
  categoryVolume: { category: string; volume: number }[];
  exerciseFrequency: { name: string; category: string; count: number; daysSinceLast: number }[];
  rpeDistribution: { rpe: string; count: number }[];
  daysSincePR: { name: string; category: string; orm: number; daysSince: number }[];
  weeklyVolume: { week: string; volume: number }[];
}

function VolumeTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-400 mb-1">Sem. {label}</p>
      <p className="text-orange-400 font-bold">{payload[0].value.toLocaleString("es-AR")} kg</p>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  squat: "Sentadilla",
  bench: "Press banca",
  deadlift: "Peso muerto",
  accessory: "Accesorios",
};

const CATEGORY_TEXT: Record<string, string> = {
  squat: "text-blue-400",
  bench: "text-green-400",
  deadlift: "text-red-400",
  accessory: "text-gray-400",
};

const CATEGORY_BG: Record<string, string> = {
  squat: "bg-blue-500",
  bench: "bg-green-500",
  deadlift: "bg-red-500",
  accessory: "bg-gray-500",
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><p className="text-gray-400">Cargando...</p></div>;
  }

  if (!stats || stats.totalSets === 0) {
    return (
      <main className="max-w-2xl mx-auto p-6 text-center py-20">
        <p className="text-4xl mb-4">📊</p>
        <p className="text-gray-300 font-semibold mb-2">Sin datos para analizar</p>
        <p className="text-gray-500 text-sm">Registrá algunas sesiones primero.</p>
      </main>
    );
  }

  const totalCatVolume = stats.categoryVolume.reduce((s, c) => s + c.volume, 0);
  const maxRpeCount = Math.max(...stats.rpeDistribution.map((r) => r.count), 1);
  const maxFreqCount = Math.max(...stats.exerciseFrequency.map((e) => e.count), 1);

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold">Stats</h2>

      {/* Volumen semanal */}
      {stats.weeklyVolume?.some((w) => w.volume > 0) && (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Volumen por semana</p>
          <div className="bg-gray-900 rounded-xl p-4">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={stats.weeklyVolume} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="week" tick={{ fill: "#6b7280", fontSize: 10 }} interval={3} />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  width={38}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                />
                <Tooltip content={<VolumeTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="volume" radius={[3, 3, 0, 0]}>
                  {stats.weeklyVolume.map((entry, i) => (
                    <Cell key={i} fill={entry.volume > 0 ? "#ea580c" : "#1f2937"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Totales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Series totales</p>
          <p className="text-2xl font-bold">{stats.totalSets.toLocaleString("es-AR")}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Volumen total</p>
          <p className="text-2xl font-bold text-orange-400">
            {stats.totalVolume.toLocaleString("es-AR")}<span className="text-sm text-gray-400"> kg</span>
          </p>
        </div>
      </div>

      {/* Tonelaje por categoría */}
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Tonelaje por categoría</p>
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          {stats.categoryVolume.map((c) => {
            const pct = totalCatVolume > 0 ? (c.volume / totalCatVolume) * 100 : 0;
            return (
              <div key={c.category}>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className={`font-medium ${CATEGORY_TEXT[c.category] ?? "text-white"}`}>
                    {CATEGORY_LABELS[c.category] ?? c.category}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {c.volume.toLocaleString("es-AR")} kg <span className="text-gray-600">· {pct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${CATEGORY_BG[c.category] ?? "bg-orange-500"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribución de RPE */}
      {stats.rpeDistribution.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Distribución de RPE</p>
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-end justify-between gap-1 h-32">
              {stats.rpeDistribution.map((r) => {
                const heightPct = (r.count / maxRpeCount) * 100;
                const rpe = parseFloat(r.rpe);
                const color =
                  rpe >= 9 ? "bg-red-500" :
                  rpe >= 8 ? "bg-orange-500" :
                  rpe >= 7 ? "bg-yellow-500" : "bg-green-500";
                return (
                  <div key={r.rpe} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500">{r.count}</span>
                    <div className={`w-full ${color} rounded-t`} style={{ height: `${heightPct}%`, minHeight: "2px" }} />
                    <span className="text-[10px] text-gray-400">{r.rpe}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-500 text-center mt-2">RPE de cada serie cargada (verde=fácil, rojo=cerca del fallo)</p>
          </div>
        </div>
      )}

      {/* Frecuencia por ejercicio */}
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Ejercicios más frecuentes</p>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-800">
            {stats.exerciseFrequency.map((e) => (
              <div key={e.name} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className={`text-sm font-medium ${CATEGORY_TEXT[e.category] ?? "text-white"}`}>{e.name}</p>
                  <p className="text-xs text-gray-400">
                    {e.count} series · hace {e.daysSinceLast}d
                  </p>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${CATEGORY_BG[e.category] ?? "bg-gray-500"}`}
                    style={{ width: `${(e.count / maxFreqCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Días desde último PR */}
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Días desde último PR</p>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-800">
            {stats.daysSincePR.map((p) => (
              <div key={p.name} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${CATEGORY_TEXT[p.category] ?? "text-white"}`}>{p.name}</p>
                  <p className="text-xs text-gray-500">{p.orm} kg</p>
                </div>
                <span className={`text-sm font-semibold ${
                  p.daysSince < 14 ? "text-green-400" :
                  p.daysSince < 30 ? "text-yellow-400" :
                  p.daysSince < 60 ? "text-orange-400" : "text-red-400"
                }`}>
                  {p.daysSince}d
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
