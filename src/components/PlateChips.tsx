"use client";

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const BAR_WEIGHT = 20;

function calcPlates(targetKg: number): { plate: number; count: number }[] {
  let remaining = (targetKg - BAR_WEIGHT) / 2;
  if (remaining < 0) return [];
  const result: { plate: number; count: number }[] = [];
  for (const plate of PLATES) {
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      result.push({ plate, count });
      remaining = +(remaining - count * plate).toFixed(3);
    }
  }
  return result;
}

function plateColor(p: number): string {
  if (p >= 25) return "#ef4444";
  if (p >= 20) return "#3b82f6";
  if (p >= 15) return "#f59e0b";
  if (p >= 10) return "#22c55e";
  return "#6b7280";
}

export default function PlateChips({ weight }: { weight: number }) {
  if (!weight || weight < BAR_WEIGHT) return null;
  const plates = calcPlates(weight);
  const loadedKg = BAR_WEIGHT + plates.reduce((s, p) => s + p.plate * p.count * 2, 0);
  const diff = weight - loadedKg;

  if (plates.length === 0) {
    return <p className="text-[10px] text-gray-600 italic">Solo barra</p>;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] text-gray-500 mr-0.5">×lado:</span>
      {plates.map(({ plate, count }) => (
        <span
          key={plate}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white leading-tight"
          style={{ backgroundColor: plateColor(plate) }}
        >
          {count}×{plate}
        </span>
      ))}
      {Math.abs(diff) > 0.01 && (
        <span className="text-[10px] text-yellow-500/80 italic">~{loadedKg}kg</span>
      )}
    </div>
  );
}
