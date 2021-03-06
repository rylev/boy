import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import u16 from 'lib/u16'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.DEC', () => {
    describe('when target is B', () => {
        it('sets the right flags', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.DEC('B')),
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.b = 0x10
            cpu.runFrame()

            assert.equal(cpu.registers.b, 0x0F)
            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.subtract, true)
            assert.equal(cpu.registers.f.zero, false)
            assert.equal(cpu.pc, rom.length)
        })
    })

    describe('when target is BC', () => {
        it('sets the right flags', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.DEC('BC')),
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.b = 0x01
            cpu.registers.c = 0xde
            cpu.runFrame()

            assert.equal(cpu.registers.bc, 0x01dd)
            assert.equal(cpu.pc, rom.length)
        })
    })
})
