import { PrismaClient } from '@prisma/client'
import { env, isTest } from '../config/env.js'

const url = isTest && env.TEST_DATABASE_URL ? env.TEST_DATABASE_URL : env.DATABASE_URL

export const prisma = new PrismaClient({
  datasources: { db: { url } },
})
