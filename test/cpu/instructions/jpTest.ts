import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.JP', () => {
    describe('when test is Z', () => {
        const rom = createRom([
            Instruction.toByte(Instruction.JP('Z')),
            0x07,
            0x01,
            Instruction.toByte(Instruction.Halt),
            Instruction.toByte(Instruction.Halt),
            Instruction.toByte(Instruction.Halt),
            Instruction.toByte(Instruction.Halt),
            Instruction.toByte(Instruction.Halt),
        ])

        it('jumps when zero flag is set', () => {
            const cpu = new CPU(undefined, rom)
            cpu.registers.f.zero = true
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length)
        })

        it('doesn\'t jump when zero flag is not set', () => {
            const cpu = new CPU(undefined, rom)
            cpu.registers.f.zero = false
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length - 4)
        })
    })

    describe('when test is true', () => {
        it('jumps', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.JP(true)),
                0x07,
                0x01,
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
            ])

            const cpu = new CPU(undefined, rom)
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length)
        })
    })
})