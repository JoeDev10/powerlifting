import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function epley(weight: number, reps: number) {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sets = await prisma.set.findMany({
    where: { session: { userId: session.user.id } },
    include: { session: { select: { date: true } }, exercise: { select: { name: true, category: true } } },
    orderBy: { session: { date: "desc" } },
  });

  if (sets.length === 0) {
    return NextResponse.json({
      totalSets: 0,
      totalVolume: 0,
      categoryVolume: [],
      exerciseFrequency: [],
      rpeDistribution: [],
      daysSincePR: [],
    });
  }

  // Volume per category
  const catVolume = new Map<string, number>();
  for (const s of sets) {
    const v = s.weight * s.reps;
    catVolume.set(s.exercise.category, (catVolume.get(s.exercise.category) ?? 0) + v);
  }

  // Exercise frequency (count of sets per exercise) — top 10
  const exerciseFreq = new Map<string, { name: string; category: string; count: number; lastDate: Date }>();
  for (const s of sets) {
    const key = s.exercise.name;
    const cur = exerciseFreq.get(key);
    if (cur) {
      cur.count++;
      if (s.session.date > cur.lastDate) cur.lastDate = s.session.date;
    } else {
      exerciseFreq.set(key, { name: s.exercise.name, category: s.exercise.category, count: 1, lastDate: s.session.date });
    }
  }

  // RPE distribution (bins by .5 from 5 to 10)
  const rpeBins = new Map<string, number>();
  for (const s of sets) {
    if (s.rpe == null) continue;
    const key = s.rpe.toFixed(1);
    rpeBins.set(key, (rpeBins.get(key) ?? 0) + 1);
  }

  // Days since last PR per main exercise (best Epley 1RM)
  const bestByExercise = new Map<string, { weight: number; reps: number; date: Date; orm: number; category: string; name: string }>();
  for (const s of sets) {
    const orm = epley(s.weight, s.reps);
    const cur = bestByExercise.get(s.exercise.name);
    if (!cur || orm > cur.orm) {
      bestByExercise.set(s.exercise.name, {
        weight: s.weight,
        reps: s.reps,
        date: s.session.date,
        orm,
        category: s.exercise.category,
        name: s.exercise.name,
      });
    }
  }

  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;

  return NextResponse.json({
    totalSets: sets.length,
    totalVolume: Math.round(sets.reduce((sum, s) => sum + s.weight * s.reps, 0)),
    categoryVolume: Array.from(catVolume.entries())
      .map(([category, volume]) => ({ category, volume: Math.round(volume) }))
      .sort((a, b) => b.volume - a.volume),
    exerciseFrequency: Array.from(exerciseFreq.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((e) => ({
        name: e.name,
        category: e.category,
        count: e.count,
        daysSinceLast: Math.floor((now - e.lastDate.getTime()) / dayMs),
      })),
    rpeDistribution: Array.from(rpeBins.entries())
      .map(([rpe, count]) => ({ rpe, count }))
      .sort((a, b) => parseFloat(a.rpe) - parseFloat(b.rpe)),
    daysSincePR: Array.from(bestByExercise.values())
      .sort((a, b) => b.orm - a.orm)
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        category: p.category,
        orm: Math.round(p.orm * 10) / 10,
        daysSince: Math.floor((now - p.date.getTime()) / dayMs),
      })),
  });
}
