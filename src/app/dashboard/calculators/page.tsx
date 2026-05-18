"use client";

import { useState } from "react";

// 1RM formulas
function epley(w: number, r: number) { return r === 1 ? w : w * (1 + r / 30); }
function brzycki(w: number, r: number) { return w * (36 / (37 - r)); }
function lombardi(w: number, r: number) { return w * Math.pow(r, 0.1); }

// Wilks 2020
function wilks(bw: number, total: number, sex: "male" | "female") {
  const a = sex === "male"
    ? [-220.4, 4.5, -0.019, 0.0001, -0.000001, 0.0000000002]
    : [-125.4255, 13.7121, -0.0330, -0.0009, 0.0000027, -0.0000000021];
  const coef = 600 / (a[0] + a[1]*bw + a[2]*bw**2 + a[3]*bw**3 + a[4]*bw**4 + a[5]*bw**5);
  return total * coef;
}

// IPF GL
function ipfGL(bw: number, total: number, sex: "male" | "female", eq: "raw" | "equipped") {
  const params: Record<string, [number, number, number]> = {
    "male-raw": [1236.25115, 1449.21864, 0.01644],
    "male-equipped": [1109.72839, 1251.24738, 0.01670],
    "female-raw": [758.11361, 949.31382, 0.02435],
    "female-equipped": [610.32796, 1045.59282, 0.03048],
  };
  const [A, B, C] = params[`${sex}-${eq}`];
  const d = A - B * Math.exp(-C * bw);
  return d <= 0 ? 0 : 100 * (total / d);
}

// Plate calculator
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const BAR_WEIGHT = 20;

function calcPlates(targetKg: number): { plate: number; count: number }[] {
  let remaining = (targetKg - BAR_WEIGHT) / 2;
  const result: { plate: number; count: number }[] = [];
  for (const plate of PLATES) {
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      result.push({ plate, count });
      remaining -= count * plate;
    }
  }
  return result;
}

type Tab = "1rm" | "wilks" | "ipf" | "plates";

export default function CalculatorsPage() {
  const [tab, setTab] = useState<Tab>("1rm");

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  const [bw, setBw] = useState("");
  const [total, setTotal] = useState("");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [eq, setEq] = useState<"raw" | "equipped">("raw");

  const [targetWeight, setTargetWeight] = useState("");

  const w = parseFloat(weight);
  const r = parseInt(reps);
  const bodyweight = parseFloat(bw);
  const tot = parseFloat(total);
  const target = parseFloat(targetWeight);

  const has1rm = !isNaN(w) && !isNaN(r) && r >= 1 && r <= 20 && w > 0;
  const hasWilks = !isNaN(bodyweight) && !isNaN(tot) && bodyweight > 0 && tot > 0;
  const hasPlates = !isNaN(target) && target >= BAR_WEIGHT;

  const plates = hasPlates ? calcPlates(target) : [];
  const actualWeight = hasPlates ? BAR_WEIGHT + plates.reduce((sum, p) => sum + p.plate * p.count * 2, 0) : 0;

  const TABS: { id: Tab; label: string }[] = [
    { id: "1rm", label: "1RM" },
    { id: "wilks", label: "Wilks" },
    { id: "ipf", label: "IPF GL" },
    { id: "plates", label: "Discos" },
  ];

  return (
    <main className="max-w-lg mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Calculadoras</h2>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "1rm" && (
        <div className="space-y-5">
          <p className="text-sm text-gray-400">Calculá tu máximo en una repetición a partir de un peso y cantidad de reps.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Peso (kg)</label>
              <input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="100"
                className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Repeticiones</label>
              <input type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="5" min={1} max={20}
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
              <input type="number" inputMode="decimal" value={bw} onChange={(e) => setBw(e.target.value)} placeholder="83"
                className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Total (kg)</label>
              <input type="number" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="500"
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
          <p className="text-sm text-gray-400">IPF GL Points — sistema oficial de la Federación Internacional de Powerlifting.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Peso corporal (kg)</label>
              <input type="number" inputMode="decimal" value={bw} onChange={(e) => setBw(e.target.value)} placeholder="83"
                className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Total (kg)</label>
              <input type="number" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="500"
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

      {tab === "plates" && (
        <div className="space-y-5">
          <p className="text-sm text-gray-400">Calculá qué discos poner en la barra. Usa barra olímpica estándar de 20 kg.</p>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Peso objetivo (kg)</label>
            <input type="number" inputMode="decimal" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
              placeholder="100" min={BAR_WEIGHT} step="0.5"
              className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none" />
          </div>

          {hasPlates && (
            <div className="bg-gray-900 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">Barra</p>
                <p className="font-semibold">{BAR_WEIGHT} kg</p>
              </div>

              {plates.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-2">Solo la barra</p>
              ) : (
                <div className="space-y-2">
                  {plates.map(({ plate, count }) => (
                    <div key={plate} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{
                            width: `${Math.max(28, plate * 1.5)}px`,
                            height: `${Math.max(28, plate * 1.5)}px`,
                            backgroundColor: plate >= 25 ? "#ef4444" : plate >= 20 ? "#3b82f6" : plate >= 15 ? "#f59e0b" : plate >= 10 ? "#22c55e" : "#6b7280",
                          }}
                        >
                          {plate}
                        </div>
                        <span className="text-sm text-gray-300">{plate} kg</span>
                      </div>
                      <span className="text-sm font-semibold">× {count} por lado</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                <span className="text-gray-300 text-sm font-medium">Total real</span>
                <span className={`text-xl font-bold ${actualWeight === target ? "text-green-400" : "text-yellow-400"}`}>
                  {actualWeight} kg
                </span>
              </div>
              {actualWeight !== target && (
                <p className="text-xs text-yellow-400">
                  Diferencia: {(target - actualWeight).toFixed(2)} kg (no alcanzable con discos estándar)
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
