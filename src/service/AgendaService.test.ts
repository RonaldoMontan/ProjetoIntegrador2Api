import { describe, it, expect, beforeEach, vi } from "vitest";
import { bancoFalso, resetarBanco, statusDe } from "../test/bancoFalso.js";
import { CriarAgendaService } from "./AgendaService.js";

vi.mock("../prisma/index.js", async () => ({ default: (await import("../test/bancoFalso.js")).bancoFalso }))

const agenda = (inicio: Date, fim: Date) => ({
    id: null, descricao: "Manicure — Lídia", funcionarioId: 2, clienteId: 1, tipoAgendaId: 2,
    horaInicio: inicio, horaFim: fim
})

describe("Criação de agendamento", () => {
    beforeEach(() => resetarBanco())

    it("recusa agendamento que termina antes de começar, sem gravar", async () => {
        const resposta = await new CriarAgendaService().execute(agenda(new Date(2026, 9, 10, 10), new Date(2026, 9, 10, 9)))
        expect(resposta).toBe("O fim da agenda deve ser depois do início")
        expect(bancoFalso.agenda.create).not.toHaveBeenCalled()
    })

    it("recusa agendamento com início e fim iguais", async () => {
        const mesmaHora = new Date(2026, 9, 10, 10)
        expect(await new CriarAgendaService().execute(agenda(mesmaHora, mesmaHora))).toBe("O fim da agenda deve ser depois do início")
    })

    it("grava um agendamento válido e já libera a primeira etapa da visita", async () => {
        const resposta = await new CriarAgendaService().execute(agenda(new Date(2026, 9, 10, 9), new Date(2026, 9, 10, 10)))
        expect(resposta).toMatchObject({ id: 1, descricao: "Manicure — Lídia" })
        expect(statusDe(1)).toBe('liberado')
    })

    it("a etapa agendada depois na mesma visita fica aguardando", async () => {
        await new CriarAgendaService().execute(agenda(new Date(2026, 9, 10, 9), new Date(2026, 9, 10, 10)))
        await new CriarAgendaService().execute(agenda(new Date(2026, 9, 10, 10), new Date(2026, 9, 10, 11)))
        expect([statusDe(1), statusDe(2)]).toEqual(['liberado', 'agendado'])
    })
})
