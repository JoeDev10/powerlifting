import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function epley(weight: number, reps: number) {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

function getWeekMonday(d: Date): string {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const dow = date.getDay();
  date.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
  return date.toISOString().slice(0, 10);
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

  // Weekly volume — last 16 weeks
  const weeklyVolMap = new Map<string, number>();
  for (const s of sets) {
    const key = getWeekMonday(s.session.date);
    weeklyVolMap.set(key, (weeklyVolMap.get(key) ?? 0) + s.weight * s.reps);
  }
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayDow = todayDate.getDay();
  const thisMonday = new Date(todayDate);
  thisMonday.setDate(todayDate.getDate() - (todayDow === 0 ? 6 : todayDow - 1));
  const weeklyVolume: { week: string; volume: number }[] = [];
  for (let i = 15; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setDate(thisMonday.getDate() - i * 7);
    const key = d.toISOString().slice(0, 10);
    const [, month, day] = key.split("-");
    weeklyVolume.push({ week: `${day}/${month}`, volume: Math.round(weeklyVolMap.get(key) ?? 0) });
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
    weeklyVolume,
  });
}
