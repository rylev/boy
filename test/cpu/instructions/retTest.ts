import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.RET', () => {
    describe('when test is Z', () => {
        const rom = createRom([
            Instruction.toByte(Instruction.RET('Z')),
            Instruction.toByte(Instruction.Halt),
            0x07,
            0x01,
            Instruction.toByte(Instruction.Halt),
            Instruction.toByte(Instruction.Halt),
            Instruction.toByte(Instruction.Halt),
            Instruction.toByte(Instruction.Halt),
        ])

        it('jumps when zero flag is set', () => {
            const cpu = new CPU(undefined, rom, {})
            cpu.registers.f.zero = true
            cpu.sp = 0x102
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length)
        })

        it('doesn\'t jump when zero flag is not set', () => {
            const cpu = new CPU(undefined, rom, {})
            cpu.registers.f.zero = false
            cpu.sp = 0x102
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length - 6)
        })
    })

    describe('when test is true', () => {
        it('jumps', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.RET(true)),
                0x07,
                0x01,
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
            ])

            const cpu = new CPU(undefined, rom, {})
            cpu.sp = 0x101
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length)
        })
    })
})