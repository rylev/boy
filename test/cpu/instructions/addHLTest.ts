import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.ADDHL', () => {
    describe('when source is bc', () => {
        it('subtracts the right amount', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.AddHL('BC')),
                Instruction.toByte(Instruction.Halt),
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.b = 0x01
            cpu.registers.c = 0x01
            cpu.registers.hl = 0x01
            cpu.runFrame()

            assert.equal(cpu.registers.hl, 0x102)
            assert.equal(cpu.registers.f.subtract, false)
            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.halfCarry, false)
            assert.equal(cpu.registers.f.zero, false)
        })
    })
})
