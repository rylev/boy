
import { assert } from 'chai'
import CPU from '../../src/cpu'
import Instruction from '../../src/cpu/Instruction'
import u16 from '../../src/lib/u16'

describe('CPU', () => {
    describe('JP a16', () => {
        it('jumps to the right address', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.JPa16),
                u16.secondByte(CPU.START_ADDR + 6),
                u16.firstByte(CPU.START_ADDR + 6),
                0x01,
                0x01,
                0x01,
                Instruction.toByte(Instruction.Halt),
            ])
            const cpu = new CPU(undefined, rom)
            const flagsBefore = cpu.registers.f
            cpu.run()

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
            const cpu = new CPU(undefined, rom)
            cpu.registers.a = 0x10
            cpu.run()

            assert.equal(cpu.registers.f.carry, false)
            assert.equal(cpu.registers.f.subtract, true)
            assert.equal(cpu.registers.f.zero, true)
            assert.equal(cpu.pc, CPU.START_ADDR + 3)
        })
    })
})

function createRom(bytes: number[]): Uint8Array {
    const pad: number[] = Array(CPU.START_ADDR).fill(0)
    const rom = pad.concat(bytes)
    return Uint8Array.from(rom)
}