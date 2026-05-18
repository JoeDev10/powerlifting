"use client";

import { useState } from "react";
import Link from "next/link";

// 1RM formulas
function epley(weight: number, reps: number) { return reps === 1 ? weight : weight * (1 + reps / 30); }
function brzycki(weight: number, reps: number) { return weight * (36 / (37 - reps)); }
function lombardi(weight: number, reps: number) { return weight * Math.pow(reps, 0.1); }

// Wilks2020
function wilks(bodyweight: number, total: number, sex: "male" | "female") {
  const a = sex === "male"
    ? [-220.4, 4.5, -0.019, 0.0001, -0.000001, 0.0000000002]
    : [-125.4255, 13.7121, -0.0330, -0.0009, 0.0000027, -0.0000000021];
  const bw = bodyweight;
  const coef = 600 / (a[0] + a[1]*bw + a[2]*bw**2 + a[3]*bw**3 + a[4]*bw**4 + a[5]*bw**5);
  return total * coef;
}

// IPF GL Points
function ipfGL(bodyweight: number, total: number, sex: "male" | "female", eq: "raw" | "equipped") {
  const params: Record<string, [number, number, number]> = {
    "male-raw": [1236.25115, 1449.21864, 0.01644],
    "male-equipped": [1109.72839, 1251.24738, 0.01670],
    "female-raw": [758.11361, 949.31382, 0.02435],
    "female-equipped": [610.32796, 1045.59282, 0.03048],
  };
  const key = `${sex}-${eq}`;
  const [A, B, C] = params[key];
  const denominator = A - B * Math.exp(-C * bodyweight);
  if (denominator <= 0) return 0;
  return 100 * (total / denominator);
}

export default function CalculatorsPage() {
  const [tab, setTab] = useState<"1rm" | "wilks" | "ipf">("1rm");

  // 1RM
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  // Wilks / IPF shared
  const [bw, setBw] = useState("");
  const [total, setTotal] = useState("");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [eq, setEq] = useState<"raw" | "equipped">("raw");

  const w = parseFloat(weight);
  const r = parseInt(reps);
  const bodyweight = parseFloat(bw);
  const tot = parseFloat(total);

  const has1rm = !isNaN(w) && !isNaN(r) && r >= 1 && r <= 20 && w > 0;
  const hasWilks = !isNaN(bodyweight) && !isNaN(tot) && bodyweight > 0 && tot > 0;

  return (
    <div>
      <main className="max-w-lg mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Calculadoras</h2>
        <div className="flex gap-2 mb-6">
          {(["1rm", "wilks", "ipf"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {t === "1rm" ? "1RM" : t === "wilks" ? "Wilks" : "IPF GL"}
            </button>
          ))}
        </div>

        {tab === "1rm" && (
          <div className="space-y-5">
            <p className="text-sm text-gray-400">Calculá tu máximo estimado en una repetición (1RM) a partir de un peso y cantidad de reps.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Peso (kg)</label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="100"
                  className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Repeticiones</label>
                <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="5" min={1} max={20}
                  className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none" />
              </div>
            </div>
            {has1rm && (
              <div className="bg-gray-900 rounded-xl p-5 space-y-3">
                <h3 className="text-sm text-gray-400 font-medium mb-4">1RM estimado</h3>
                {[
                  { label: "Epley", value: epley(w, r) },
                  { label: "Brzycki", value: brzycki(w, r) },
                  { label: "Lombardi", value: lombardi(w, r) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">{label}</span>
                    <span className="text-xl font-bold text-orange-400">{value.toFixed(1)} kg</span>
                  </div>
                ))}
                <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                  <span className="text-gray-300 text-sm font-medium">Promedio</span>
                  <span className="text-2xl font-bold text-white">
                    {((epley(w, r) + brzycki(w, r) + lombardi(w, r)) / 3).toFixed(1)} kg
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "wilks" && (
          <div className="space-y-5">
            <p className="text-sm text-gray-400">Coeficiente Wilks 2020 — compara la fuerza entre distintos pesos corporales.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Peso corporal (kg)</label>
                <input type="number" value={bw} onChange={(e) => setBw(e.target.value)} placeholder="83"
                  className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Total (kg)</label>
                <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="500"
                  className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              {(["male", "female"] as const).map((s) => (
                <button key={s} onClick={() => setSex(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${sex === s ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                  {s === "male" ? "Masculino" : "Femenino"}
                </button>
              ))}
            </div>
            {hasWilks && (
              <div className="bg-gray-900 rounded-xl p-5 text-center">
                <p className="text-gray-400 text-sm mb-2">Puntos Wilks</p>
                <p className="text-5xl font-bold text-orange-400">{wilks(bodyweight, tot, sex).toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        {tab === "ipf" && (
          <div className="space-y-5">
            <p className="text-sm text-gray-400">IPF GL Points — sistema de puntuación oficial de la Federación Internacional de Powerlifting.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Peso corporal (kg)</label>
                <input type="number" value={bw} onChange={(e) => setBw(e.target.value)} placeholder="83"
                  className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Total (kg)</label>
                <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="500"
                  className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              {(["male", "female"] as const).map((s) => (
                <button key={s} onClick={() => setSex(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${sex === s ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                  {s === "male" ? "Masculino" : "Femenino"}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              {(["raw", "equipped"] as const).map((e) => (
                <button key={e} onClick={() => setEq(e)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${eq === e ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                  {e === "raw" ? "Raw" : "Equipado"}
                </button>
              ))}
            </div>
            {hasWilks && (
              <div className="bg-gray-900 rounded-xl p-5 text-center">
                <p className="text-gray-400 text-sm mb-2">IPF GL Points</p>
                <p className="text-5xl font-bold text-orange-400">{ipfGL(bodyweight, tot, sex, eq).toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
