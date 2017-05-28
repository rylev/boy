import { assert } from 'chai'
import CPU from '../../../src/cpu'
import Instruction from '../../../src/cpu/Instruction'

describe('CPU', () => {
    describe('SUB n when n is not d8', () => {
        it('jumps to the right address', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.SUB('A')),
                Instruction.toByte(Instruction.Halt),
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.registers.a = 0x10
            cpu.runFrame()

            assert.equal(cpu.pc, rom.length)
            assert.equal(cpu.registers.a, 0)
        })
    })
})

function createRom(bytes: number[]): Uint8Array {
    const pad: number[] = Array(CPU.START_ADDR).fill(0)
    const rom = pad.concat(bytes)
    return Uint8Array.from(rom)
}