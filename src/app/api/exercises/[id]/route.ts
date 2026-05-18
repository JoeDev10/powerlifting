import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const ex = await prisma.exercise.findFirst({ where: { id, userId: session.user.id } });
  if (!ex) return NextResponse.json({ error: "No encontrado o no es tuyo" }, { status: 404 });

  // Check usage; deleting an exercise with sets would orphan them, so block it
  const usageCount = await prisma.set.count({ where: { exerciseId: id } });
  if (usageCount > 0) {
    return NextResponse.json({ error: `Tiene ${usageCount} series registradas, no se puede eliminar` }, { status: 400 });
  }

  await prisma.exercise.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
