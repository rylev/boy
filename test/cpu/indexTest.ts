
import { assert } from 'chai'
import CPU from '../../src/cpu'
import Instruction from '../../src/cpu/Instruction'

describe('CPU', () => {
    describe('jump', () => {
        it('jumps to the right address', () => {
            const rom = [
                Instruction.toByte(Instruction.JPa16),
                0x00,
                0x06,
                0x00,
                0x00,
                0x00,
                Instruction.toByte(Instruction.Halt),
            ]
            const cpu = new CPU(undefined, rom)
            cpu.run()

            assert.equal(cpu.pc, 7)
        })
    })
})