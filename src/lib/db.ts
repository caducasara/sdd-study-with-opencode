import mongoose from 'mongoose'

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalCache = globalThis as typeof globalThis & { __mongooseCache?: MongooseCache }

const cache: MongooseCache = globalCache.__mongooseCache ?? { conn: null, promise: null }
globalCache.__mongooseCache = cache

/**
 * Conecta ao MongoDB reutilizando a conexão entre hot reloads em desenvolvimento.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI não configurada')
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { bufferCommands: false })
  }

  try {
    cache.conn = await cache.promise
  } catch (error) {
    cache.promise = null
    throw error
  }

  return cache.conn
}

/** Utilitário para testes: limpa o cache de conexão. */
export function resetDBCache(): void {
  cache.conn = null
  cache.promise = null
}
