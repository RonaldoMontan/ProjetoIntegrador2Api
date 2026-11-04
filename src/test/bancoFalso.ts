import { vi } from "vitest";

// Banco em memória que substitui o Prisma nos testes: só implementa o que os services usam.
type Linha = {
    id: number
    descricao: string
    funcionarioId: number
    clienteId: number | null
    tipoAgendaId: number
    horaInicio: Date
    horaFim: Date
    status: string
    [relacao: string]: unknown
}

let linhas: Linha[] = []
let proximoId = 1

function combina(linha: Linha, where: any = {}){
    if(where.id !== undefined && linha.id !== where.id) return false
    if(where.clienteId !== undefined && linha.clienteId !== where.clienteId) return false
    if(where.funcionarioId !== undefined && linha.funcionarioId !== where.funcionarioId) return false
    if(typeof where.status === 'string' && linha.status !== where.status) return false
    if(where.status?.not !== undefined && linha.status === where.status.not) return false
    if(where.horaInicio?.gte && linha.horaInicio < where.horaInicio.gte) return false
    if(where.horaInicio?.lt && linha.horaInicio >= where.horaInicio.lt) return false
    return true
}

const bancoFalso = {
    agenda: {
        findMany: vi.fn(async ({ where, orderBy }: any = {}) => {
            const resultado = linhas.filter((l) => combina(l, where)).map((l) => ({ ...l }))
            if(orderBy?.horaInicio === 'asc') resultado.sort((a, b) => a.horaInicio.getTime() - b.horaInicio.getTime())
            return resultado
        }),
        findUnique: vi.fn(async ({ where }: any) => {
            const linha = linhas.find((l) => l.id === where.id)
            return linha ? { ...linha } : null
        }),
        update: vi.fn(async ({ where, data }: any) => {
            const linha = linhas.find((l) => l.id === where.id)
            if(!linha) throw new Error("registro não encontrado")
            Object.assign(linha, data)
            return { ...linha }
        }),
        create: vi.fn(async ({ data }: any) => {
            const linha: Linha = { status: 'agendado', ...data, id: proximoId++ }
            linhas.push(linha)
            return { ...linha }
        })
    }
}

function resetarBanco(iniciais: Partial<Linha>[] = []){
    linhas = []
    proximoId = 1
    for(const linha of iniciais){
        linhas.push({ descricao: '', funcionarioId: 1, clienteId: 1, tipoAgendaId: 1, status: 'agendado', ...linha, id: proximoId++ } as Linha)
    }
    vi.clearAllMocks()
}

const statusDe = (id: number) => linhas.find((l) => l.id === id)?.status

export { bancoFalso, resetarBanco, statusDe }
