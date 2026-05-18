import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sessions = await prisma.trainingSession.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { notes, sets } = await req.json();

  const trainingSession = await prisma.trainingSession.create({
    data: {
      userId: session.user.id,
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

  return NextResponse.json(trainingSession, { status: 201 });
}
