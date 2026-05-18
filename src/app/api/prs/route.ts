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
    include: {
      exercise: true,
      session: { select: { date: true } },
    },
  });

  // Best set per exercise: highest actual weight (for 1-rep sets) or best 1RM estimate
  const prMap = new Map<string, {
    exerciseId: string;
    name: string;
    category: string;
    bestWeight: number;
    bestReps: number;
    bestOrm: number;
    date: string;
  }>();

  for (const set of sets) {
    const orm = Math.round(epley(set.weight, set.reps) * 10) / 10;
    const existing = prMap.get(set.exerciseId);
    if (!existing || orm > existing.bestOrm) {
      prMap.set(set.exerciseId, {
        exerciseId: set.exerciseId,
        name: set.exercise.name,
        category: set.exercise.category,
        bestWeight: set.weight,
        bestReps: set.reps,
        bestOrm: orm,
        date: new Date(set.session.date).toISOString().split("T")[0],
      });
    }
  }

  const prs = Array.from(prMap.values()).sort((a, b) => {
    const order = ["squat", "bench", "deadlift", "accessory"];
    return order.indexOf(a.category) - order.indexOf(b.category);
  });

  return NextResponse.json(prs);
}
