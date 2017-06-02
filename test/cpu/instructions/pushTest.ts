import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import u16 from 'lib/u16'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.PUSH', () => {
    describe('when target is bc', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.PUSH('BC')),
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom)
            cpu.registers.bc = 0xfeed
            cpu.sp = 0xfffe
            cpu.runFrame()

            assert.equal(cpu.bus.read(0xfffd), 0xfe)
            assert.equal(cpu.bus.read(0xfffc), 0xed)
            assert.equal(cpu.pc, rom.length)
        })
    })
})