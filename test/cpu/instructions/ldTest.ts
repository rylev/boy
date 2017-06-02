import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import u16 from 'lib/u16'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.LD', () => {
    describe('when target is b and source is d', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LD('B', 'D')),
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.b = 0x10
            cpu.registers.d = 0x20
            cpu.runFrame()

            assert.equal(cpu.registers.b, 0x20)
            assert.equal(cpu.registers.d, 0x20)
            assert.equal(cpu.pc, rom.length)
        })
    })

    describe('when target is b and source is d8', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LD('B', 'd8')),
                0x20,
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.b = 0x10
            cpu.runFrame()

            assert.equal(cpu.registers.b, 0x20)
            assert.equal(cpu.pc, rom.length)
        })
    })
})
