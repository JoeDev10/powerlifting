import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const blocks = await prisma.block.findMany({
    where: { userId: session.user.id },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(blocks);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, phase, startDate, endDate, notes } = await req.json();
  if (!name || !phase || !startDate || !endDate) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const block = await prisma.block.create({
    data: {
      userId: session.user.id,
      name,
      phase,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      notes: notes || null,
    },
  });

  return NextResponse.json(block, { status: 201 });
}
