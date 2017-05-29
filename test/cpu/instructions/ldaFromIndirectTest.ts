import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import u16 from 'lib/u16'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.LDAFromIndirect', () => {
    describe('when source is (bc)', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LDAFromIndirect('(BC)')),
                Instruction.toByte(Instruction.Halt),
                0,
                0,
                0x10, 
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.registers.b = u16.msb(rom.length - 1)
            cpu.registers.c = u16.lsb(rom.length - 1)
            cpu.runFrame()

            assert.equal(cpu.registers.a, 0x10)
            assert.equal(cpu.pc, rom.length - 3)
        })
    })

    describe('when source is (hl-)', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LDAFromIndirect('(HL-)')),
                Instruction.toByte(Instruction.Halt),
                0,
                0,
                0x10, 
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.registers.h = u16.msb(rom.length - 1)
            cpu.registers.l = u16.lsb(rom.length - 1)
            cpu.runFrame()

            assert.equal(cpu.registers.a, 0x10)
            assert.equal(cpu.registers.hl, rom.length - 2)
            assert.equal(cpu.pc, rom.length - 3)
        })
    })
    describe('when source is (a16)', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LDAFromIndirect('(a16)')),
                0x05,
                0x01,
                Instruction.toByte(Instruction.Halt),
                0,
                0x10
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.runFrame()

            assert.equal(cpu.registers.a, 0x10)
            assert.equal(cpu.pc, rom.length - 2)
        })
    })
})
