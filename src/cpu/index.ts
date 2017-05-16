import Registers from './Registers'
import Instruction from './Instruction'
import Bus from './Bus'
import { assertExhaustive } from 'typescript'
import u16 from 'lib/u16'
import uint from 'lib/uint'

type Address = number
type Cycles = number

export class CPU {
    static get START_ADDR(): number { return 0x150 } 
    registers: Registers 
    pc: number
    sp: number
    bus: Bus
    private _isRunning: boolean = false

    constructor(bios: Uint8Array | undefined, rom: Uint8Array) {
        this.bus = new Bus(bios, rom)
        this.registers = new Registers()
        this.pc = bios ? 0 : CPU.START_ADDR
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
        // OPCodes Map: http://pastraiser.com/cpu/gameboy/gameboy_opcodes.html
        // OPCodes Explanation: http://www.chrisantonellis.com/files/gameboy/gb-instructions.txt
        switch (instruction.type) {
            case 'ADD HL,BC':
                const [result, carry] = u16.wrappingAdd(this.registers.hl, this.registers.bc)
                this.registers.hl = result
                // 1  8
                // - 0 H C
                this.registers.f.subtract = false
                this.registers.f.halfCarry = false // TODO: Set halfCarry
                this.registers.f.carry = carry
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
            case 'CP d8':
                // 2  8
                // Z 1 H C
                const data = this.bus.read(this.pc + 1)
                this.registers.f.zero = this.registers.a === data
                this.registers.f.subtract = true
                this.registers.f.halfCarry = false // TODO: Set halfCarry
                this.registers.f.carry = this.registers.a < data
                return [this.pc + 2, 8]
            case 'JR Z,R8':
                // 2  12/8
                // - - - -
                let newPC, cycles
                if (this.registers.f.zero) {
                    cycles = 12
                    const relativeValue = this.pc + 1
                    newPC = this.pc + uint.asSigned(relativeValue)
                } else {
                    cycles = 8
                    newPC = this.pc + 2
                }
                return [newPC, cycles]

            case 'XOR A':
                // 1  4
                // Z 0 0 0
                this.registers.a ^= this.bus.read(this.pc + 1)
                this.registers.f.zero = this.registers.a === 0
                return [1,4]
            default:
                return assertExhaustive(instruction)
        }
    }
}

export default CPU