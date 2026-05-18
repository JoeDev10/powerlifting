import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const templates = await prisma.template.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, sets } = await req.json();
  if (!name?.trim() || !Array.isArray(sets) || sets.length === 0) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const template = await prisma.template.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      sets: {
        create: sets.map(
          (s: { exerciseId: string; weight: number; reps: number; rpe?: number | null; order: number }) => ({
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
  return NextResponse.json(template, { status: 201 });
}
