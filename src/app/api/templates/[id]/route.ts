import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const template = await prisma.template.findFirst({
    where: { id, userId: session.user.id },
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });
  if (!template) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(template);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.template.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
