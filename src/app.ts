import { fastify } from 'fastify'
import cors from '@fastify/cors'
import { routes } from './routes.js'

// Montado aqui para ser usado tanto pelo servidor local (server.ts) quanto pela função da Vercel (api/index.ts)
export const app = fastify({ logger: true })

app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
})

app.register(routes)

app.get('/', async () => {
    return { hello: 'world' }
})
