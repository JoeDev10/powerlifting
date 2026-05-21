import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null);

  const { id } = await params;

  const lastSet = await prisma.set.findFirst({
    where: { exerciseId: id, session: { userId: session.user.id } },
    orderBy: { session: { date: "desc" } },
    include: { session: { select: { id: true, date: true } } },
  });

  if (!lastSet) return NextResponse.json(null);

  const sets = await prisma.set.findMany({
    where: { sessionId: lastSet.session.id, exerciseId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({
    date: lastSet.session.date,
    sets: sets.map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe })),
  });
}
