import type { IncomingMessage, ServerResponse } from 'node:http'
import { app } from '../src/app.js'

// Função serverless da Vercel: todas as rotas são redirecionadas para cá (vercel.json)
// e repassadas ao Fastify
export default async function handler(req: IncomingMessage, res: ServerResponse){
    await app.ready()
    app.server.emit('request', req, res)
}
