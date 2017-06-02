import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import u16 from 'lib/u16'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.POP', () => {
    describe('when target is af', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.POP('AF')),
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.af = 0xFF00 | 0b10110000
            cpu.sp = 0xfffe
            cpu.runFrame()

            assert.equal(cpu.registers.a, 0)
            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.subtract, false)
            assert.equal(cpu.registers.f.halfCarry, false)
            assert.equal(cpu.registers.f.zero, false)
            assert.equal(cpu.pc, rom.length)
        })
    })
})
