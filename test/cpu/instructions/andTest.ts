import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import u16 from 'lib/u16'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.AND', () => {
    describe('when n is d8', () => {
        it('sets the right flags', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.AND('d8')),
                0x10, 
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x11
            cpu.runFrame()

            assert.equal(cpu.registers.a, 0x10)
            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.halfCarry, true)
            assert.equal(cpu.registers.f.subtract, false)
            assert.equal(cpu.registers.f.zero, false)
            assert.equal(cpu.pc, rom.length)
        })
    })

    describe('when n is B', () => {
        it('sets the right flags', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.AND('B')),
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x11
            cpu.registers.b = 0x10
            cpu.runFrame()

            assert.equal(cpu.registers.a, 0x10)
            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.halfCarry, true)
            assert.equal(cpu.registers.f.subtract, false)
            assert.equal(cpu.registers.f.zero, false)
            assert.equal(cpu.pc, rom.length)
        })
    })

    describe('when n is (HL)', () => {
        it('sets the right flags', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.AND('(HL)')),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.NOP),
                Instruction.toByte(Instruction.NOP),
                Instruction.toByte(Instruction.NOP),
                0x10
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x11
            cpu.registers.h = u16.msb(rom.length - 1)
            cpu.registers.l = u16.lsb(rom.length - 1)
            cpu.runFrame()


            assert.equal(cpu.registers.a, 0x10)
            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.halfCarry, true)
            assert.equal(cpu.registers.f.subtract, false)
            assert.equal(cpu.registers.f.zero, false)
            assert.equal(cpu.pc, rom.length - 4)
        })
    })
})