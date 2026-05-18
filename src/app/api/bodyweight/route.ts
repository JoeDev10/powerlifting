import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const entries = await prisma.bodyWeight.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { weight, date, notes } = await req.json();
  const w = parseFloat(weight);
  if (isNaN(w) || w <= 0 || w > 500) {
    return NextResponse.json({ error: "Peso inválido" }, { status: 400 });
  }

  const entry = await prisma.bodyWeight.create({
    data: {
      userId: session.user.id,
      weight: w,
      notes: notes?.trim() || null,
      ...(date ? { date: new Date(date) } : {}),
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
