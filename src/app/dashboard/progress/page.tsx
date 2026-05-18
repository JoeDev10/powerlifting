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

const CATEGORY_ORDER = ["squat", "bench", "deadlift", "accessory"];

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

export default function ProgressPage() {
  const [exercises, setExercises] = useState<ExerciseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => r.json())
      .then((data: ExerciseProgress[]) => {
        // Sort by category priority then name
        const sorted = data.sort((a, b) => {
          const ai = CATEGORY_ORDER.indexOf(a.category);
          const bi = CATEGORY_ORDER.indexOf(b.category);
          return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
        });
        setExercises(sorted);
        if (sorted.length > 0) setSelected(sorted[0].name);
        setLoading(false);
      });
  }, []);

  const current = exercises.find((e) => e.name === selected);
  const maxOrm = current ? Math.max(...current.data.map((d) => d.orm)) : 0;
  const minOrm = current ? Math.min(...current.data.map((d) => d.orm)) : 0;
  const improvement = current && current.data.length > 1
    ? current.data[current.data.length - 1].orm - current.data[0].orm
    : 0;

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

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold">Progreso</h2>

      {/* Exercise selector */}
      <div className="flex gap-2 flex-wrap">
        {exercises.map((ex) => (
          <button
            key={ex.name}
            onClick={() => setSelected(ex.name)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              selected === ex.name
                ? "border-transparent text-white"
                : "border-gray-700 text-gray-400 hover:text-white"
            }`}
            style={selected === ex.name ? { backgroundColor: CATEGORY_COLOR[ex.category] ?? "#ea580c" } : {}}
          >
            {ex.name}
          </button>
        ))}
      </div>

      {current && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Mejor 1RM</p>
              <p className="text-2xl font-bold text-white">{maxOrm} <span className="text-sm text-gray-400">kg</span></p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Último 1RM</p>
              <p className="text-2xl font-bold text-white">
                {current.data[current.data.length - 1].orm} <span className="text-sm text-gray-400">kg</span>
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Progreso total</p>
              <p className={`text-2xl font-bold ${improvement >= 0 ? "text-green-400" : "text-red-400"}`}>
                {improvement >= 0 ? "+" : ""}{improvement.toFixed(1)} <span className="text-sm">kg</span>
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-4">1RM estimado (Epley) — kg</p>
            {current.data.length === 1 ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
                Registrá más sesiones para ver la evolución
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={current.data.map((d) => ({ ...d, date: formatDate(d.date) }))}>
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

          {/* History table */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-sm font-medium text-gray-300">Historial de 1RM</p>
            </div>
            <div className="divide-y divide-gray-800">
              {[...current.data].reverse().map((d) => (
                <div key={d.date} className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-400">{d.date}</span>
                  <span className="font-semibold text-white">{d.orm} kg</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
