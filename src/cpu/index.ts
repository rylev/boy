import Registers from './Registers'
import Instruction from './Instruction'
import { assertExhaustive } from '../typescript'
import { u16WrappingAdd } from '../u16'

type Address = number
type Cycles = number

export default class CPU {
    registers: Registers 
    pc: number
    bus: Bus

    constructor(rom: number[]) {
        this.registers = new Registers()
        this.pc = 0x100
        this.bus = new Bus()
    }

    step(instruction: Instruction): [Address, Cycles] {
        switch (instruction.type) {
            case 'ADD HL,BC':
                const [result, carry] = u16WrappingAdd(this.registers.hl, this.registers.bc)
                this.registers.hl = result
                // 1  8
                // - 0 H C
                this.registers.f['subtract'] = false
                this.registers.f['halfCarry'] = false // TODO: Set this
                this.registers.f['carry'] = carry
                return [this.pc + 1, 8]
            case 'JP a16': 
                // 3  16
                // - - - -
                const address = (this.bus.read(this.pc + 1) << 8) + this.bus.read(this.pc + 2)
                return [address, 16]
            default:
                return assertExhaustive(instruction)
        }
    }
}

class Bus {
    read(addr: number): number {
        return 0
    }
}