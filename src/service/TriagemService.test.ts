import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetarBanco, statusDe } from "../test/bancoFalso.js";
import { recalcularVisita, IniciarAgendaService, ConcluirAgendaService } from "./TriagemService.js";

vi.mock("../prisma/index.js", async () => ({ default: (await import("../test/bancoFalso.js")).bancoFalso }))

const hora = (h: number, m = 0) => new Date(2026, 9, 10, h, m)

// visita da cliente 1 em 10/10: manicure 9h -> cabelo 10h -> maquiagem 11h
function criarVisita(){
    resetarBanco([
        { clienteId: 1, tipoAgendaId: 2, horaInicio: hora(9), horaFim: hora(10) },
        { clienteId: 1, tipoAgendaId: 1, horaInicio: hora(10), horaFim: hora(11) },
        { clienteId: 1, tipoAgendaId: 3, horaInicio: hora(11), horaFim: hora(12) }
    ])
}

async function concluir(id: number){
    await new IniciarAgendaService().execute({ id: String(id) })
    await new ConcluirAgendaService().execute({ id: String(id) })
}

describe("Triagem encadeada", () => {
    beforeEach(criarVisita)

    it("libera só a primeira etapa da visita", async () => {
        await recalcularVisita(1, hora(9))
        expect([statusDe(1), statusDe(2), statusDe(3)]).toEqual(['liberado', 'agendado', 'agendado'])
    })

    it("não deixa iniciar uma etapa cuja anterior não foi concluída", async () => {
        await recalcularVisita(1, hora(9))
        const resposta = await new IniciarAgendaService().execute({ id: "2" })
        expect(resposta).toBe("A etapa anterior desta cliente ainda não foi concluída")
        expect(statusDe(2)).toBe('agendado')
    })

    it("não deixa concluir uma etapa que não foi iniciada", async () => {
        await recalcularVisita(1, hora(9))
        const resposta = await new ConcluirAgendaService().execute({ id: "1" })
        expect(resposta).toBe("Inicie a etapa antes de concluir")
        expect(statusDe(1)).toBe('liberado')
    })

    it("não deixa iniciar a mesma etapa duas vezes", async () => {
        await recalcularVisita(1, hora(9))
        await new IniciarAgendaService().execute({ id: "1" })
        expect(statusDe(1)).toBe('em_andamento')
        expect(await new IniciarAgendaService().execute({ id: "1" })).toBe("Esta etapa já foi iniciada")
    })

    it("ao concluir uma etapa libera a próxima e mantém as seguintes aguardando", async () => {
        await recalcularVisita(1, hora(9))
        await concluir(1)
        expect([statusDe(1), statusDe(2), statusDe(3)]).toEqual(['concluido', 'liberado', 'agendado'])

        await concluir(2)
        expect([statusDe(2), statusDe(3)]).toEqual(['concluido', 'liberado'])
    })

    it("não mistura etapas de outra cliente ou de outro dia", async () => {
        resetarBanco([
            { clienteId: 1, horaInicio: hora(9), horaFim: hora(10) },
            { clienteId: 2, horaInicio: hora(10), horaFim: hora(11) },
            { clienteId: 1, horaInicio: new Date(2026, 9, 11, 10), horaFim: new Date(2026, 9, 11, 11) }
        ])
        await recalcularVisita(1, hora(9))
        expect([statusDe(1), statusDe(2), statusDe(3)]).toEqual(['liberado', 'agendado', 'agendado'])
    })

    it("responde quando a agenda não existe", async () => {
        expect(await new IniciarAgendaService().execute({ id: "99" })).toBe("Agenda não encontrada")
        expect(await new ConcluirAgendaService().execute({ id: "99" })).toBe("Agenda não encontrada")
    })
})
