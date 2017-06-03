import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import u16 from 'lib/u16'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.LD', () => {
    describe('when target is n is positive', () => {
        it('adds n', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LDHLSPn),
                0x12,
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom)
            cpu.sp = 0x100
            cpu.runFrame()

            assert.equal(cpu.registers.hl, 0x112)
            assert.equal(cpu.pc, rom.length)
        })
    })

    describe('when target is n is negative', () => {
        it('subtracts n', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LDHLSPn),
                0xff,
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom)
            cpu.sp = 0x100
            cpu.runFrame()

            assert.equal(cpu.registers.hl, 0xff)
            assert.equal(cpu.pc, rom.length)
        })
    })
})