import Registers from './Registers'
import Instruction from './Instruction'
import Bus from './Bus'
import { assertExhaustive } from '../typescript'
import { u16WrappingAdd } from '../u16'

type Address = number
type Cycles = number

export class CPU {
    registers: Registers 
    pc: number
    sp: number
    bus: Bus
    private _isRunning: boolean = false

    constructor(bios: Uint8Array | undefined, rom: Uint8Array) {
        this.bus = new Bus(bios, rom)
        this.registers = new Registers()
        this.pc = bios ? 0 : 0x150
        this.sp = 0 
    }

    get isRunning(): boolean {
        return this._isRunning
    }

    run () {
        this._isRunning = true
        while (this._isRunning) {
            const instructionByte = this.bus.read(this.pc)
            const instruction = Instruction.fromByte(instructionByte)
            const [nextPC, _ ] = this.step(instruction)
            // TODO: make sure the cpu runs at the right clock speed
            this.pc = nextPC
        }
    }

    step(instruction: Instruction): [Address, Cycles] {
        // OPCodes: http://pastraiser.com/cpu/gameboy/gameboy_opcodes.html
        switch (instruction.type) {
            case 'ADD HL,BC':
                const [result, carry] = u16WrappingAdd(this.registers.hl, this.registers.bc)
                this.registers.hl = result
                // 1  8
                // - 0 H C
                this.registers.f['subtract'] = false
                this.registers.f['halfCarry'] = false // TODO: Set halfCarry
                this.registers.f['carry'] = carry
                return [this.pc + 1, 8]
            case 'JP a16': 
                // 3  16
                // - - - -
                const address = (this.bus.read(this.pc + 1) << 8) + this.bus.read(this.pc + 2)
                return [address, 16]
            case 'HALT':
                // 1  4
                // - - - -
                this._isRunning = false
                return [this.pc + 1, 4]
            default:
                return assertExhaustive(instruction)
        }
    }
}

export default CPU