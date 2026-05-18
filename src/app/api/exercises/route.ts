import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const VALID_CATEGORIES = ["squat", "bench", "deadlift", "accessory"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const exercises = await prisma.exercise.findMany({
    where: { OR: [{ userId: null }, { userId: session.user.id }] },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(exercises);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, category } = await req.json();
  if (!name?.trim() || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const exercise = await prisma.exercise.create({
    data: { name: name.trim(), category, userId: session.user.id },
  });
  return NextResponse.json(exercise, { status: 201 });
}
