// Run manually after deploy: npx tsx prisma/seed.ts
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

const exercises = [
  { name: "Sentadilla", category: "squat" },
  { name: "Sentadilla frontal", category: "squat" },
  { name: "Press de banca", category: "bench" },
  { name: "Press de banca agarre cerrado", category: "bench" },
  { name: "Press inclinado con barra", category: "bench" },
  { name: "Peso muerto", category: "deadlift" },
  { name: "Peso muerto rumano", category: "deadlift" },
  { name: "Peso muerto sumo", category: "deadlift" },
  { name: "Press militar", category: "accessory" },
  { name: "Remo con barra", category: "accessory" },
  { name: "Dominadas", category: "accessory" },
  { name: "Hip thrust", category: "accessory" },
  { name: "Good morning", category: "accessory" },
  { name: "Curl de biceps", category: "accessory" },
  { name: "Extension de triceps", category: "accessory" },
];

async function main() {
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: {},
      create: exercise,
    });
  }
  console.log(`Seed completado: ${exercises.length} ejercicios`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
