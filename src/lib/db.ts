import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // In production (Vercel/Turso): DATABASE_URL = libsql://dbname-orgname.turso.io
  // In development (local): DATABASE_URL = file:/home/z/my-project/db/custom.db
  const dbUrl = process.env.DATABASE_URL || 'file:/home/z/my-project/db/custom.db'
  const authToken = process.env.DATABASE_AUTH_TOKEN || undefined

  const adapter = new PrismaLibSQL({
    url: dbUrl,
    authToken,
  })

  return new PrismaClient({
    adapter,
  })
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
