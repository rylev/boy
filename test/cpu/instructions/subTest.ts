import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.SUB', () => {
    describe('when n is not d8', () => {
        it('subtracts the right amount', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.SUB('A')),
                Instruction.toByte(Instruction.Halt),
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x10
            cpu.runFrame()

            assert.equal(cpu.clockTicksInFrame, 8)
            assert.equal(cpu.pc, rom.length)
            assert.equal(cpu.registers.a, 0)
            assert.equal(cpu.registers.f.subtract, true)
            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.halfCarry, false)
            assert.equal(cpu.registers.f.zero, true)
        })

        it('subtracts the right amount', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.SUB('B')),
                Instruction.toByte(Instruction.Halt),
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x10
            cpu.registers.b = 0x11
            cpu.runFrame()

            assert.equal(cpu.clockTicksInFrame, 8)
            assert.equal(cpu.pc, rom.length)
            assert.equal(cpu.registers.a, 0xff)
            assert.equal(cpu.registers.f.subtract, true)
            assert.equal(cpu.registers.f.carry, true)
            assert.equal(cpu.registers.f.halfCarry, false)
            assert.equal(cpu.registers.f.zero, false)
        })
        // TODO: Test half carry is implemented correctly
    })

    describe('when n is d8', () => {
        it('subtracts the right amount', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.SUB('d8')),
                0x14,
                Instruction.toByte(Instruction.Halt),
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x10
            cpu.runFrame()

            assert.equal(cpu.clockTicksInFrame, 12)
            assert.equal(cpu.pc, rom.length)
            assert.equal(cpu.registers.a, 0xfc)
            assert.equal(cpu.registers.f.subtract, true)
            assert.equal(cpu.registers.f.carry, true)
            assert.equal(cpu.registers.f.halfCarry, false)
            assert.equal(cpu.registers.f.zero, false)
        })
    })
})