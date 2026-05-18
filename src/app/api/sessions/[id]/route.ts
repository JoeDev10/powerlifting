import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const trainingSession = await prisma.trainingSession.findFirst({
    where: { id, userId: session.user.id },
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  if (!trainingSession) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(trainingSession);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.trainingSession.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
