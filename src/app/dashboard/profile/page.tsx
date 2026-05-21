"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserData {
  name: string | null;
  email: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [nameError, setNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data: UserData) => {
        setUser(data);
        setName(data.name ?? "");
      });
  }, []);

  async function handleSaveName() {
    setNameError("");
    setNameSuccess(false);
    setSavingName(true);
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setNameSuccess(true);
      setUser((prev) => (prev ? { ...prev, name } : prev));
    } else {
      const data = await res.json();
      setNameError(data.error ?? "Error al guardar");
    }
    setSavingName(false);
  }

  async function handleSavePassword() {
    setPasswordError("");
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setSavingPassword(true);
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const data = await res.json();
      setPasswordError(data.error ?? "Error al cambiar la contraseña");
    }
    setSavingPassword(false);
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <main className="max-w-lg mx-auto p-4 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">
          ← Volver
        </button>
        <h2 className="text-2xl font-bold">Perfil</h2>
      </div>

      {/* Info básica */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Cuenta</p>
        <p className="text-sm text-gray-400">Email</p>
        <p className="font-medium">{user.email}</p>
        <p className="text-xs text-gray-600 pt-1">
          Miembro desde{" "}
          {new Date(user.createdAt).toLocaleDateString("es-AR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Cambiar nombre */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Nombre</h3>
        {nameError && <p className="text-red-400 text-xs">{nameError}</p>}
        {nameSuccess && (
          <p className="text-green-400 text-xs">
            Nombre guardado. Se verá en el próximo inicio de sesión.
          </p>
        )}
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameSuccess(false); }}
          placeholder="Tu nombre"
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
        />
        <button
          onClick={handleSaveName}
          disabled={savingName || name === (user.name ?? "")}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {savingName ? "Guardando..." : "Guardar nombre"}
        </button>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Contraseña</h3>
        {passwordError && <p className="text-red-400 text-xs">{passwordError}</p>}
        {passwordSuccess && (
          <p className="text-green-400 text-xs">Contraseña actualizada correctamente.</p>
        )}
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => { setCurrentPassword(e.target.value); setPasswordSuccess(false); }}
          placeholder="Contraseña actual"
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nueva contraseña (mín. 6 caracteres)"
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirmar nueva contraseña"
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
        />
        <button
          onClick={handleSavePassword}
          disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {savingPassword ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </div>
    </main>
  );
}
