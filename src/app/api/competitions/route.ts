import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const competitions = await prisma.competition.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(competitions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, date, weightClass, squat, bench, deadlift, notes } = await req.json();
  if (!name || !date) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const s = squat ? parseFloat(squat) : null;
  const b = bench ? parseFloat(bench) : null;
  const d = deadlift ? parseFloat(deadlift) : null;
  const total = s !== null && b !== null && d !== null ? s + b + d : null;

  const competition = await prisma.competition.create({
    data: {
      userId: session.user.id,
      name,
      date: new Date(date),
      weightClass: weightClass ? parseFloat(weightClass) : null,
      squat: s,
      bench: b,
      deadlift: d,
      total,
      notes: notes || null,
    },
  });

  return NextResponse.json(competition, { status: 201 });
}
