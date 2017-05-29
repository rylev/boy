import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.JR', () => {
    describe('when test is Z', () => {
        describe('when next byte is positive', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.JR('Z')),
                0x04,
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
            ])

            it('jumps when zero flag is set', () => {
                const cpu = new CPU(undefined, rom, {})
                cpu.registers.f.zero = true
                cpu.runFrame()

                assert.equal(cpu.pc, rom.length)
            })

            it('doesn\'t jump when zero flag is set', () => {
                const cpu = new CPU(undefined, rom, {})
                cpu.registers.f.zero = false
                cpu.runFrame()

                assert.equal(cpu.pc, rom.length - 4)
            })
        })

        it('jumps when zero flag is set and next byte is negative', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.NOP),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.JR('Z')),
                0xFE,
                Instruction.toByte(Instruction.NOP)
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.registers.f.zero = true
            cpu.pc = rom.length - 3
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length - 3)
        })
    })

    describe('when test is true', () => {
        describe('when next byte is positive', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.JR(true)),
                0x04,
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
            ])

            it('jumps when zero flag is set', () => {
                const cpu = new CPU(undefined, rom, {})
                cpu.runFrame()

                assert.equal(cpu.pc, rom.length)
            })
        })

        it('jumps when zero flag is set and next byte is negative', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.NOP),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.JR(true)),
                0xFE,
                Instruction.toByte(Instruction.NOP)
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.pc = rom.length - 3
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length - 3)
        })
    })
})