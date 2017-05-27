
import { assert } from 'chai'
import CPU from '../../src/cpu'
import Instruction from '../../src/cpu/Instruction'
import u16 from '../../src/lib/u16'

describe('CPU', () => {
    describe('JP a16', () => {
        it('jumps to the right address', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.JPa16),
                u16.lsb(CPU.START_ADDR + 6),
                u16.msb(CPU.START_ADDR + 6),
                0x01,
                0x01,
                0x01,
                Instruction.toByte(Instruction.Halt),
            ])
            const cpu = new CPU(undefined, rom, {})
            const flagsBefore = cpu.registers.f
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length)
            assert.equal(flagsBefore, cpu.registers.f)
        })
    })

    describe('CP d8', () => {
        it('sets the right flags', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.CPd8),
                0x10, 
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.registers.a = 0x10
            cpu.runFrame()

            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.subtract, true)
            assert.equal(cpu.registers.f.zero, true)
            assert.equal(cpu.pc, rom.length)
        })
    })

    describe('JR Z,r8', () => {
        it('jumps when zero flag is set', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.JRzr8),
                0x04,
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.registers.f.zero = true
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length)
        })

        it('doesn\'t jump when zero flag is set', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.JRzr8),
                0x4,
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.registers.f.zero = false
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length - 2)
        })

        it('jumps when zero flag is set and next byte is negative', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.NOP),
                Instruction.toByte(Instruction.Halt),
                Instruction.toByte(Instruction.JRzr8),
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
})

function createRom(bytes: number[]): Uint8Array {
    const pad: number[] = Array(CPU.START_ADDR).fill(0)
    const rom = pad.concat(bytes)
    return Uint8Array.from(rom)
}