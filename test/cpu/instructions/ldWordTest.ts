import { assert } from 'chai'
import CPU from 'cpu'
import Instruction from 'cpu/Instruction'
import u16 from 'lib/u16'
import { createRom } from './instructionsTestHelpers'

describe('Instruction.LDWord', () => {
    describe('when target is bc', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LDWord('BC')),
                0x10, 
                0x30, 
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.runFrame()

            assert.equal(cpu.registers.bc, 0x3010)
            assert.equal(cpu.pc, rom.length)
        })
    })

    describe('when target is sp', () => {
        it('sets it', () => {
            const rom = createRom([
                Instruction.toByte(Instruction.LDWord('SP')),
                0x10, 
                0x30, 
                Instruction.toByte(Instruction.Halt)
            ])
            const cpu = new CPU(undefined, rom, {})
            cpu.runFrame()

            assert.equal(cpu.sp, 0x3010)
            assert.equal(cpu.pc, rom.length)
        })
    })
})