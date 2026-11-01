import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

// Conexão pelo driver pg, sem o binário nativo do Prisma (necessário na Vercel)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prismaClient =  new PrismaClient({ adapter });

export default prismaClient;
