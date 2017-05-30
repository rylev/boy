import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import u16 from 'lib/u16'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.SWAP', () => {
    describe('when n is B', () => {
        it('sets the right flags', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.PREFIX),
                Instruction.toByte(Instruction.SWAP('B'), true),
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.registers.f.carry = true
            cpu.registers.b = 0xdc
            cpu.runFrame()

            assert.equal(cpu.registers.b, 0xcd)
            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.halfCarry, false)
            assert.equal(cpu.registers.f.subtract, false)
            assert.equal(cpu.registers.f.zero, false)
            assert.equal(cpu.pc, rom.length)
        })
    })
})
