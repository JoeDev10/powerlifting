"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ExerciseProgress {
  name: string;
  category: string;
  data: { date: string; orm: number }[];
}

const CATEGORY_COLOR: Record<string, string> = {
  squat: "#3b82f6",
  bench: "#22c55e",
  deadlift: "#ef4444",
  accessory: "#a78bfa",
};

const CATEGORY_TEXT: Record<string, string> = {
  squat: "text-blue-400",
  bench: "text-green-400",
  deadlift: "text-red-400",
  accessory: "text-gray-400",
};

const CATEGORY_ORDER = ["squat", "bench", "deadlift", "accessory"];
const MAIN_LIFTS = ["Sentadilla", "Press de banca", "Peso muerto"];

function formatDate(dateStr: string) {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-white font-bold">{payload[0].value} kg</p>
    </div>
  );
}

function MiniChart({ data, color }: { data: { date: string; orm: number }[]; color: string }) {
  if (data.length < 2) {
    return (
      <div className="h-16 flex items-center justify-center text-gray-600 text-xs">
        + datos para ver evolución
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={64}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <Line type="monotone" dataKey="orm" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function ProgressPage() {
  const [exercises, setExercises] = useState<ExerciseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState<"1m" | "3m" | "6m" | "1y" | "all">("all");

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => r.json())
      .then((data: ExerciseProgress[]) => {
        const sorted = data.sort((a, b) => {
          const ai = CATEGORY_ORDER.indexOf(a.category);
          const bi = CATEGORY_ORDER.indexOf(b.category);
          return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
        });
        setExercises(sorted);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <main className="max-w-2xl mx-auto p-6 text-center py-20">
        <p className="text-4xl mb-4">📈</p>
        <p className="text-gray-300 font-semibold mb-2">Todavía no hay datos de progreso</p>
        <p className="text-gray-500 text-sm">Registrá al menos una sesión para ver tu evolución.</p>
      </main>
    );
  }

  // Overview: main lifts
  const mainLifts = MAIN_LIFTS
    .map((name) => exercises.find((e) => e.name === name))
    .filter((e): e is ExerciseProgress => !!e);

  // All-exercise summary with trend
  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;
  const summary = exercises.map((ex) => {
    const best = Math.max(...ex.data.map((d) => d.orm));
    const latest = ex.data[ex.data.length - 1];
    const last30Best = Math.max(
      ...ex.data
        .filter((d) => (now - new Date(d.date).getTime()) / dayMs <= 30)
        .map((d) => d.orm),
      0
    );
    const prev30Best = Math.max(
      ...ex.data
        .filter((d) => {
          const diff = (now - new Date(d.date).getTime()) / dayMs;
          return diff > 30 && diff <= 60;
        })
        .map((d) => d.orm),
      0
    );
    const trend = prev30Best > 0 ? last30Best - prev30Best : null;
    return { ...ex, best, latest, trend };
  });

  const rangeMs: Record<string, number> = { "1m": 30, "3m": 90, "6m": 180, "1y": 365 };
  const current = selected ? exercises.find((e) => e.name === selected) : null;
  const filteredData = current
    ? current.data.filter((d) => {
        if (range === "all") return true;
        const diff = (Date.now() - new Date(d.date).getTime()) / (1000 * 60 * 60 * 24);
        return diff <= rangeMs[range];
      })
    : [];
  const maxOrm = filteredData.length ? Math.max(...filteredData.map((d) => d.orm)) : 0;
  const minOrm = filteredData.length ? Math.min(...filteredData.map((d) => d.orm)) : 0;
  const improvement =
    filteredData.length > 1
      ? filteredData[filteredData.length - 1].orm - filteredData[0].orm
      : 0;

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold">Progreso</h2>

      {/* Main lifts overview */}
      {mainLifts.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">3 Grandes</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {mainLifts.map((ex) => {
              const best = Math.max(...ex.data.map((d) => d.orm));
              const color = CATEGORY_COLOR[ex.category] ?? "#ea580c";
              return (
                <button
                  key={ex.name}
                  onClick={() => setSelected(ex.name)}
                  className="bg-gray-900 hover:bg-gray-800 rounded-xl p-3 text-left transition-colors"
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <p className={`text-xs font-semibold ${CATEGORY_TEXT[ex.category] ?? "text-white"}`}>{ex.name}</p>
                    <p className="text-lg font-bold text-white">{best} <span className="text-xs text-gray-500">kg</span></p>
                  </div>
                  <MiniChart data={ex.data} color={color} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* All PRs table */}
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Todos los PRs</p>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
            <span>Ejercicio</span>
            <span className="text-right">1RM</span>
            <span className="text-right w-16">30d</span>
          </div>
          <div className="divide-y divide-gray-800">
            {summary.map((ex) => (
              <button
                key={ex.name}
                onClick={() => setSelected(ex.name)}
                className={`w-full grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 items-center hover:bg-gray-800/50 transition-colors text-left ${
                  selected === ex.name ? "bg-gray-800/40" : ""
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${CATEGORY_TEXT[ex.category] ?? "text-white"}`}>{ex.name}</p>
                  <p className="text-xs text-gray-500">{ex.latest.date}</p>
                </div>
                <span className="font-bold text-white text-right">{ex.best} <span className="text-xs text-gray-500">kg</span></span>
                <span className={`text-xs font-medium text-right w-16 ${
                  ex.trend === null ? "text-gray-600" :
                  ex.trend > 0 ? "text-green-400" :
                  ex.trend < 0 ? "text-red-400" : "text-gray-400"
                }`}>
                  {ex.trend === null ? "—" : `${ex.trend > 0 ? "+" : ""}${ex.trend.toFixed(1)}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drill-down */}
      {current && (
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Detalle: {current.name}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(
                  [
                    ["1m", "1M"],
                    ["3m", "3M"],
                    ["6m", "6M"],
                    ["1y", "1A"],
                    ["all", "Todo"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setRange(val)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      range === val
                        ? "bg-orange-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setSelected(null); setRange("all"); }}
                className="text-xs text-gray-500 hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="bg-gray-900 rounded-xl flex items-center justify-center h-32 text-gray-500 text-sm">
              Sin datos en este rango de tiempo
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-gray-900 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5 uppercase">Mejor</p>
                  <p className="text-lg font-bold">
                    {maxOrm}<span className="text-xs text-gray-400"> kg</span>
                  </p>
                </div>
                <div className="bg-gray-900 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5 uppercase">Último</p>
                  <p className="text-lg font-bold">
                    {filteredData[filteredData.length - 1].orm}
                    <span className="text-xs text-gray-400"> kg</span>
                  </p>
                </div>
                <div className="bg-gray-900 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5 uppercase">
                    {filteredData.length > 1 ? "Total" : "Datos"}
                  </p>
                  {filteredData.length > 1 ? (
                    <p className={`text-lg font-bold ${improvement >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {improvement >= 0 ? "+" : ""}{improvement.toFixed(1)}
                      <span className="text-xs"> kg</span>
                    </p>
                  ) : (
                    <p className="text-lg font-bold text-gray-500">1</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-4">1RM estimado (Epley) — kg</p>
                {filteredData.length === 1 ? (
                  <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
                    Registrá más sesiones para ver la evolución
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={filteredData.map((d) => ({ ...d, date: formatDate(d.date) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
                      <YAxis
                        domain={[Math.floor(minOrm * 0.95), Math.ceil(maxOrm * 1.05)]}
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                        width={45}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={maxOrm} stroke="#4b5563" strokeDasharray="4 4" />
                      <Line
                        type="monotone"
                        dataKey="orm"
                        stroke={CATEGORY_COLOR[current.category] ?? "#ea580c"}
                        strokeWidth={2.5}
                        dot={{ fill: CATEGORY_COLOR[current.category] ?? "#ea580c", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
