import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.ADDC', () => {
    describe('when n is not d8', () => {
        it('adds the right amount', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.ADDC('A')),
                Instruction.toByte(Instruction.Halt),
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x10
            cpu.registers.f.carry = true
            cpu.runFrame()

            assert.equal(cpu.registers.a, 0x21)
            assert.equal(cpu.registers.f.subtract, false)
            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.halfCarry, false)
            assert.equal(cpu.registers.f.zero, false)
        })
        // TODO: Test half carry is implemented correctly
    })

    describe('when n is d8', () => {
        it('subtracts the right amount', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.ADDC('d8')),
                0x14,
                Instruction.toByte(Instruction.Halt),
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x10
            cpu.registers.f.carry = true
            cpu.runFrame()

            assert.equal(cpu.registers.a, 0x25)
            assert.equal(cpu.registers.f.subtract, false)
            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.halfCarry, false)
            assert.equal(cpu.registers.f.zero, false)
        })
    })
})
