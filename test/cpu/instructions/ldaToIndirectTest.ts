import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import u16 from 'lib/u16'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.LDAToIndirect', () => {
    describe('when target is (bc)', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LDAToIndirect('(BC)')),
                Instruction.toByte(Instruction.Halt),
                0,
                0,
                0, 
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x10
            cpu.registers.b = u16.msb(rom.length - 1)
            cpu.registers.c = u16.lsb(rom.length - 1)
            cpu.runFrame()

            assert.equal(cpu.bus.read(rom.length - 1), 0x10)
            assert.equal(cpu.pc, rom.length - 3)
        })
    })

    describe('when target is (hl-)', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LDAToIndirect('(HL-)')),
                Instruction.toByte(Instruction.Halt),
                0,
                0,
                0, 
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x10
            cpu.registers.h = u16.msb(rom.length - 1)
            cpu.registers.l = u16.lsb(rom.length - 1)
            cpu.runFrame()

            assert.equal(cpu.bus.read(rom.length - 1), 0x10)
            assert.equal(cpu.registers.hl, rom.length - 2)
            assert.equal(cpu.pc, rom.length - 3)
        })
    })
    describe('when source is (a16)', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LDAToIndirect('(a16)')),
                0x05,
                0x01,
                Instruction.toByte(Instruction.Halt),
                0,
                0
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x10
            cpu.runFrame()

            assert.equal(cpu.bus.read(rom.length - 1), 0x10)
            assert.equal(cpu.pc, rom.length - 2)
        })
    })
})

