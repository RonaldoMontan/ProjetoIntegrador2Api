import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetarBanco } from "../test/bancoFalso.js";
import { BuscarIndicadoresService } from "./IndicadoresService.js";

vi.mock("../prisma/index.js", async () => ({ default: (await import("../test/bancoFalso.js")).bancoFalso }))

const lidia = { id: 1, descricao: "Lídia", dataNascimento: new Date("2002-09-22T00:00:00.000Z") }   // 24 anos em out/2026
const ana = { id: 2, descricao: "Ana", dataNascimento: new Date("1989-03-09T00:00:00.000Z") }       // 37 anos
const semNascimento = { id: 3, descricao: "Sem data", dataNascimento: null }
const cabelo = { id: 1, descricao: "Cabelereiro" }
const manicure = { id: 2, descricao: "Manicure" }
const luis = { id: 1, descricao: "Luis" }
const cleo = { id: 6, descricao: "Cleo" }
const cleide = { id: 2, descricao: "Cleide" }

function atendimento(cliente: any, servico: any, profissional: any, data: Date, status = 'concluido'){
    return {
        clienteId: cliente.id, cliente,
        tipoAgendaId: servico.id, tipoAgenda: servico,
        funcionarioId: profissional.id, funcionario: profissional,
        horaInicio: data, horaFim: data, status
    }
}

describe("Indicadores (BI)", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 10, 3, 12))
        const dia = new Date(2026, 9, 10, 10)
        resetarBanco([
            atendimento(lidia, cabelo, cleo, dia),
            atendimento(ana, cabelo, cleo, dia),
            atendimento(ana, cabelo, luis, dia),
            atendimento(lidia, manicure, cleide, dia),
            atendimento(semNascimento, manicure, cleide, dia),
            // não concluídos: ficam fora dos indicadores, mas entram nos próximos dias
            atendimento(lidia, cabelo, luis, new Date(2026, 10, 3, 15), 'liberado'),
            atendimento(ana, manicure, cleide, new Date(2026, 10, 5, 9), 'agendado'),
            atendimento(ana, manicure, cleide, new Date(2026, 10, 5, 11), 'agendado')
        ])
    })
    afterEach(() => vi.useRealTimers())

    it("conta só atendimentos concluídos", async () => {
        const r = await new BuscarIndicadoresService().execute()
        expect(r.totalAtendimentos).toBe(5)
    })

    it("ordena os serviços do mais procurado para o menos procurado", async () => {
        const r = await new BuscarIndicadoresService().execute()
        expect(r.servicos.map((s) => [s.descricao, s.total])).toEqual([["Cabelereiro", 3], ["Manicure", 2]])
    })

    it("mostra quem mais atendeu cada serviço", async () => {
        const r = await new BuscarIndicadoresService().execute()
        expect(r.servicos[0]!.profissionais.map((p) => [p.descricao, p.total])).toEqual([["Cleo", 2], ["Luis", 1]])
    })

    it("distribui as clientes por faixa etária e ignora quem não tem nascimento", async () => {
        const r = await new BuscarIndicadoresService().execute()
        const faixas = Object.fromEntries(r.faixas.map((f) => [f.faixa, f.total]))
        expect(faixas["18 a 24"]).toBe(2)   // Lídia: cabelo e manicure
        expect(faixas["35 a 44"]).toBe(2)   // Ana: dois cabelos
        expect(r.faixas.reduce((soma, f) => soma + f.total, 0)).toBe(4)
    })

    it("calcula a idade média por serviço", async () => {
        const r = await new BuscarIndicadoresService().execute()
        expect(r.servicos.find((s) => s.descricao === "Cabelereiro")!.idadeMedia).toBe(Math.round((24 + 37 + 37) / 3))
        expect(r.servicos.find((s) => s.descricao === "Manicure")!.idadeMedia).toBe(24)
    })

    it("calcula a idade na data do atendimento, antes e depois do aniversário", async () => {
        resetarBanco([
            atendimento(lidia, cabelo, luis, new Date(2026, 8, 21, 10)),  // véspera: 23 anos
            atendimento(lidia, cabelo, luis, new Date(2026, 8, 22, 10))   // aniversário: 24 anos
        ])
        const r = await new BuscarIndicadoresService().execute()
        const faixas = Object.fromEntries(r.faixas.map((f) => [f.faixa, f.total]))
        expect(r.servicos[0]!.idadeMedia).toBe(Math.round((23 + 24) / 2))
        expect(faixas["18 a 24"]).toBe(2)
    })

    it("lista 14 dias de próximos agendamentos, com zero nos dias vazios", async () => {
        const r = await new BuscarIndicadoresService().execute()
        expect(r.proximosDias).toHaveLength(14)
        expect(r.proximosDias[0]).toEqual({ data: "2026-11-03", total: 1 })
        expect(r.proximosDias[1]).toEqual({ data: "2026-11-04", total: 0 })
        expect(r.proximosDias[2]).toEqual({ data: "2026-11-05", total: 2 })
    })
})
