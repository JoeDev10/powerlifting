import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const Database = require("better-sqlite3");

const sqlite = new Database(path.resolve(__dirname, "dev.db"));
const adapter = new PrismaBetterSqlite3(sqlite);
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
  { name: "Curl de bíceps", category: "accessory" },
  { name: "Extensión de tríceps", category: "accessory" },
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
