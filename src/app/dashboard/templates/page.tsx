"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TemplateSet {
  exercise: { name: string; category: string };
  weight: number;
  reps: number;
}

interface Template {
  id: string;
  name: string;
  createdAt: string;
  sets: TemplateSet[];
}

const CATEGORY_COLOR: Record<string, string> = {
  squat: "text-blue-400",
  bench: "text-green-400",
  deadlift: "text-red-400",
  accessory: "text-gray-400",
};

function groupByExercise(sets: TemplateSet[]) {
  const map = new Map<string, { name: string; category: string; count: number }>();
  for (const s of sets) {
    const key = s.exercise.name;
    if (!map.has(key)) map.set(key, { name: s.exercise.name, category: s.exercise.category, count: 0 });
    map.get(key)!.count++;
  }
  return Array.from(map.values());
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  async function deleteTemplate(id: string) {
    if (!confirm("¿Eliminar este template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold mb-6">Templates</h2>

      <p className="text-sm text-gray-400">
        Guardá tus rutinas como templates y reutilizalas al crear una nueva sesión.
      </p>

      {templates.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 rounded-xl">
          <p className="text-gray-500 mb-2">Todavía no tenés templates</p>
          <p className="text-xs text-gray-600 mb-4">Creá uno desde una sesión nueva con &quot;Guardar como template&quot;</p>
          <Link
            href="/dashboard/session/new"
            className="bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl px-5 py-2.5 inline-block transition-colors text-sm"
          >
            Crear sesión
          </Link>
        </div>
      ) : (
        templates.map((t) => {
          const exGroups = groupByExercise(t.sets);
          return (
            <div key={t.id} className="bg-gray-900 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.sets.length} series · {exGroups.length} ejercicio{exGroups.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Eliminar
                </button>
              </div>

              <div className="space-y-1">
                {exGroups.map((g) => (
                  <div key={g.name} className="flex items-center justify-between text-sm">
                    <span className={CATEGORY_COLOR[g.category] ?? "text-white"}>{g.name}</span>
                    <span className="text-gray-500 text-xs">{g.count} series</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </main>
  );
}
