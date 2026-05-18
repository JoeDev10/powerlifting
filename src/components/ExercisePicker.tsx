"use client";

import { useState } from "react";

export interface Exercise {
  id: string;
  name: string;
  category: string;
  userId?: string | null;
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

const CATEGORIES = ["squat", "bench", "deadlift", "accessory"] as const;

export function ExercisePicker({
  exercises,
  onSelect,
  onClose,
  onCreated,
}: {
  exercises: Exercise[];
  onSelect: (id: string) => void;
  onClose: () => void;
  onCreated: (ex: Exercise) => void;
}) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<typeof CATEGORIES[number]>("accessory");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );
  const grouped = filtered.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.category] ??= []).push(ex);
    return acc;
  }, {});

  async function handleCreate() {
    setCreateError("");
    if (!newName.trim()) { setCreateError("Poné un nombre"); return; }
    setSubmitting(true);
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), category: newCategory }),
    });
    if (res.ok) {
      const ex = await res.json();
      onCreated(ex);
      onSelect(ex.id);
    } else {
      const data = await res.json().catch(() => ({}));
      setCreateError(data.error ?? "Error al crear");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-gray-900 w-full rounded-t-2xl p-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{creating ? "Crear ejercicio" : "Seleccionar ejercicio"}</h3>
          <button onClick={onClose} className="text-gray-400 text-sm px-2 py-1">Cerrar</button>
        </div>

        {creating ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nombre</label>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Sentadilla pausa"
                className="bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Categoría</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewCategory(c)}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      newCategory === c ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>
            {createError && (
              <p className="text-red-400 text-xs">{createError}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setCreating(false); setCreateError(""); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2.5 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
              >
                {submitting ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              autoFocus
              type="text"
              placeholder="Buscar ejercicio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2.5 mb-3 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm w-full"
            />

            <button
              onClick={() => { setNewName(search); setCreating(true); }}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-dashed border-gray-700 hover:border-orange-500 text-gray-300 hover:text-orange-400 rounded-lg px-3 py-2.5 mb-4 text-sm transition-colors"
            >
              + Crear ejercicio nuevo {search && <span className="text-gray-500">{`"${search}"`}</span>}
            </button>

            <div className="overflow-y-auto space-y-4 pb-2">
              {Object.entries(grouped).map(([cat, exs]) => (
                <div key={cat}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${CATEGORY_COLOR[cat] ?? "text-white"}`}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </p>
                  <div className="space-y-1">
                    {exs.map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => onSelect(ex.id)}
                        className="w-full text-left px-3 py-3 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-lg text-sm transition-colors flex items-center justify-between"
                      >
                        <span>{ex.name}</span>
                        {ex.userId && <span className="text-[10px] text-gray-500 uppercase tracking-wide">Custom</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-6">Sin resultados — creá uno nuevo arriba</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
