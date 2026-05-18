import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-2">Hola, {session.user?.name?.split(" ")[0] ?? "atleta"}</h2>
      <p className="text-gray-400 mb-8">¿Listo para entrenar?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/session/new"
          className="bg-orange-600 hover:bg-orange-500 rounded-xl p-6 transition-colors"
        >
          <div className="text-3xl mb-3">+</div>
          <div className="font-semibold text-lg">Nueva sesión</div>
          <div className="text-orange-200 text-sm mt-1">Registrar entrenamiento de hoy</div>
        </Link>

        <Link
          href="/dashboard/history"
          className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-colors"
        >
          <div className="text-3xl mb-3">📋</div>
          <div className="font-semibold text-lg">Historial</div>
          <div className="text-gray-400 text-sm mt-1">Ver sesiones anteriores</div>
        </Link>

        <Link
          href="/dashboard/calculators"
          className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-colors"
        >
          <div className="text-3xl mb-3">🧮</div>
          <div className="font-semibold text-lg">Calculadoras</div>
          <div className="text-gray-400 text-sm mt-1">1RM · Wilks · IPF GL Points</div>
        </Link>
      </div>
    </main>
  );
}
