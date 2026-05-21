import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, currentPassword, newPassword } = await req.json();

  if (newPassword !== undefined) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Ingresá la contraseña actual" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword as string, user.password);
    if (!valid) return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });

    const hashed = await bcrypt.hash(newPassword as string, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { ...(name !== undefined ? { name } : {}), password: hashed },
    });
  } else if (name !== undefined) {
    await prisma.user.update({ where: { id: session.user.id }, data: { name } });
  }

  return NextResponse.json({ ok: true });
}
