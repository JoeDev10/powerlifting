import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.goal.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { achieved } = await req.json();

  const existing = await prisma.goal.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updated = await prisma.goal.update({
    where: { id },
    data: { achievedAt: achieved ? new Date() : null },
  });
  return NextResponse.json(updated);
}
