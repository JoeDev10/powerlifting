import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Epley 1RM formula
function epley(weight: number, reps: number) {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Get all sets grouped by exercise and date
  const sets = await prisma.set.findMany({
    where: {
      session: { userId: session.user.id },
    },
    include: {
      exercise: true,
      session: { select: { date: true } },
    },
    orderBy: { session: { date: "asc" } },
  });

  // Group by exercise, then by date — keep best 1RM per day
  const byExercise = new Map<string, { name: string; category: string; data: { date: string; orm: number }[] }>();

  for (const set of sets) {
    const key = set.exercise.id;
    if (!byExercise.has(key)) {
      byExercise.set(key, { name: set.exercise.name, category: set.exercise.category, data: [] });
    }

    const dateStr = new Date(set.session.date).toISOString().split("T")[0];
    const orm = Math.round(epley(set.weight, set.reps) * 10) / 10;
    const entry = byExercise.get(key)!;

    const existing = entry.data.find((d) => d.date === dateStr);
    if (existing) {
      if (orm > existing.orm) existing.orm = orm;
    } else {
      entry.data.push({ date: dateStr, orm });
    }
  }

  // Only return exercises with at least 2 data points (to show a trend)
  const result = Array.from(byExercise.values()).filter((e) => e.data.length >= 1);

  return NextResponse.json(result);
}
