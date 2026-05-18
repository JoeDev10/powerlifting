import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function epley(weight: number, reps: number) {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [goals, sets] = await Promise.all([
    prisma.goal.findMany({
      where: { userId: session.user.id },
      orderBy: [{ achievedAt: "asc" }, { createdAt: "desc" }],
      include: { exercise: true },
    }),
    prisma.set.findMany({
      where: { session: { userId: session.user.id } },
      select: { exerciseId: true, weight: true, reps: true },
    }),
  ]);

  // Compute current best 1RM per exercise
  const bestByExercise = new Map<string, number>();
  for (const s of sets) {
    const orm = epley(s.weight, s.reps);
    const prev = bestByExercise.get(s.exerciseId) ?? 0;
    if (orm > prev) bestByExercise.set(s.exerciseId, orm);
  }

  const enriched = goals.map((g) => {
    const current = bestByExercise.get(g.exerciseId) ?? 0;
    const start = g.startWeight ?? 0;
    const pct = g.targetWeight > start
      ? Math.max(0, Math.min(100, ((current - start) / (g.targetWeight - start)) * 100))
      : current >= g.targetWeight ? 100 : 0;
    return { ...g, currentOrm: Math.round(current * 10) / 10, progressPct: Math.round(pct) };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { exerciseId, targetWeight, targetDate } = await req.json();
  const target = parseFloat(targetWeight);
  if (!exerciseId || isNaN(target) || target <= 0) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // Compute current best as starting point
  const sets = await prisma.set.findMany({
    where: { session: { userId: session.user.id }, exerciseId },
    select: { weight: true, reps: true },
  });
  let startWeight = 0;
  for (const s of sets) {
    const orm = epley(s.weight, s.reps);
    if (orm > startWeight) startWeight = orm;
  }

  const goal = await prisma.goal.create({
    data: {
      userId: session.user.id,
      exerciseId,
      targetWeight: target,
      startWeight: Math.round(startWeight * 10) / 10,
      ...(targetDate ? { targetDate: new Date(targetDate) } : {}),
    },
    include: { exercise: true },
  });
  return NextResponse.json(goal, { status: 201 });
}
