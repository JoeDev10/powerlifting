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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { notes, sets } = await req.json();

  // Verify ownership
  const existing = await prisma.trainingSession.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Delete old sets and recreate
  await prisma.set.deleteMany({ where: { sessionId: id } });

  const updated = await prisma.trainingSession.update({
    where: { id },
    data: {
      notes,
      sets: {
        create: sets.map(
          (s: { exerciseId: string; weight: number; reps: number; rpe?: number; order: number }) => ({
            exerciseId: s.exerciseId,
            weight: s.weight,
            reps: s.reps,
            rpe: s.rpe ?? null,
            order: s.order,
          })
        ),
      },
    },
    include: { sets: { include: { exercise: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.trainingSession.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
