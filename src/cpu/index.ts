import Registers from './Registers'
import Instruction from './Instruction'
import Bus from './Bus'
import { assertExhaustive } from 'typescript'
import u16 from 'lib/u16'
import uint from 'lib/uint'

type Address = number
type Cycles = number

export class CPU {
    static get START_ADDR(): number { return 0x100 } 
    registers: Registers 
    pc: number
    sp: number
    bus: Bus
    private _prefix: boolean = false
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
            this.step()
        }
    }
            
    step() {
        const instructionByte = this.bus.read(this.pc)
        const instruction = Instruction.fromByte(instructionByte, this._prefix)
        const [nextPC, _] = this.execute(instruction)
        // TODO: make sure the cpu runs at the right clock speed
        this.pc = nextPC
    }

    execute(instruction: Instruction): [Address, Cycles] {
        // OPCodes Map: http://pastraiser.com/cpu/gameboy/gameboy_opcodes.html
        // OPCodes Explanation: http://www.chrisantonellis.com/files/gameboy/gb-instructions.txt
        this._prefix = false
        switch (instruction.type) {
            case 'HALT':
                // 1  4
                // - - - -
                this._isRunning = false
                return [this.pc + 1, 4]
            case 'NOP':
                // 1  4
                // - - - -
                return [this.pc + 1, 4]
            case 'DI':
                // 1  4
                // - - - -
                // TODO: actually disable interrupts
                return [this.pc + 1, 4]
            case 'PREFIX CB':
                // 1  4
                // - - - -
                this._prefix = true
                return [this.pc + 1, 4]

            case 'ADD HL,BC':
                // 1  8
                // - 0 H C
                const [result, carry] = u16.wrappingAdd(this.registers.hl, this.registers.bc)
                this.registers.hl = result
                this.registers.f.subtract = false
                this.registers.f.halfCarry = false // TODO: Set halfCarry
                this.registers.f.carry = carry
                return [this.pc + 1, 8]
            case 'CP d8':
                // 2  8
                // Z 1 H C
                this.cp(this.readNextByte())
                return [this.pc + 2, 8]
            case 'XOR A':
                // 1  4
                // Z 0 0 0
                this.xor(this.registers.a)
                return [this.pc + 1, 4]
            case 'RLA':
                // 1  4
                // 0 0 0 C
                this.rotateLeft(this.registers.a, false)
                return [this.pc + 1, 4]

            case 'JP a16': 
                // 3  16
                // - - - -
                return [this.readNextWord(), 16]
            case 'JR Z,r8':
                // 2  12/8
                // - - - -
                return this.conditionalJump(this.registers.f.zero) 
            case 'JR NZ,r8':
                // 2  12/8
                // - - - -
                return this.conditionalJump(!this.registers.f.zero) 
            case 'JR R8':
                // 2  12
                // - - - -
                return [this.pc + uint.asSigned(this.readNextByte()), 12]
            case 'CALL a16':
                // 3  24
                // - - - -
                this.push(this.pc + 3)
                return [this.readNextWord(), 24]
            case 'LD A,d8':
                // 2  8
                // - - - -
                this.registers.a = this.readNextByte()
                return [this.pc + 2, 8]

            case 'LD (a16),A':
                // 3  16
                // - - - -
                this.bus.write(this.readNextWord(), this.registers.a)
                return [this.pc + 3, 16]
            case 'LDH (a8),A':
                // 2  12
                // - - - -
                this.bus.write(0xff00 + this.bus.read(this.pc + 1), this.registers.a)
                return [this.pc + 2, 12]
            case 'LD SP,d16':
                // 3  12
                // - - - -
                this.sp = this.readNextWord()
                return [this.pc + 3, 12]
            case 'LD HL,d16':
                // 3  12
                // - - - -
                this.registers.hl = this.readNextWord()
                return [this.pc + 3, 12]
            case 'LD (HL-),A':
                // 1  8
                // - - - -
                this.bus.write(this.registers.hl, this.registers.a)
                this.registers.hl = this.registers.hl - 1
                return [this.pc + 1, 8]
            case 'LD C,d8':
                // 2  8
                // - - - -
                this.registers.c = this.readNextByte()
                return [this.pc + 2, 8]
            case 'LD (C),A':
                // 2  8
                // - - - -
                this.bus.write(0xff00 + this.registers.c, this.registers.a)
                return [this.pc + 2, 8]
            case 'LD (HL),A':
                // 1  8
                // - - - -
                this.bus.write(this.registers.hl, this.registers.a)
                return [this.pc + 1, 8]
            case 'LD DE,d16':
                // 3  12
                // - - - -
                this.registers.de = this.readNextWord()
                return [this.pc + 3, 12]
            case 'LD A,(DE)':
                // 1  8
                // - - - -
                this.registers.a = this.bus.read(this.registers.de)
                return [this.pc + 1, 8]
            case 'LD C,A':
                // 1  4
                // - - - -
                this.registers.c = this.registers.a
                return [this.pc + 1, 4]
            case 'LD B,d8':
                // 2  8
                // - - - -
                this.registers.b = this.readNextByte()
                return [this.pc + 2, 8]

            case 'PUSH BC':
                // 1  16
                // - - - -
                this.push(this.registers.bc)
                return [this.pc + 1, 16]
            
            case 'BIT 7,H':
                // 1  4
                // Z 0 1 -
                this.bitTest(this.registers.h, 7)
                return [this.pc + 1, 4]
            case 'RL C':
                // 1  4
                // Z 0 0 C
                this.registers.c = this.rotateLeft(this.registers.c, true)
                return [this.pc + 1, 4]

            default:
                return assertExhaustive(instruction)
        }
    }

    rotateLeft(value: number, setZero: boolean): number {
        const carry = this.registers.f.carry ? 1 : 0
        const newValue = (value << 1) | carry
        this.registers.f.carry = (value & 0x80) != 0
        this.registers.f.zero = setZero && (newValue == 0)
        this.registers.f.halfCarry = false 
        this.registers.f.subtract = false
        return newValue
    }

    conditionalJump(condition: boolean): [Address, Cycles] {
        if (condition) {
            return [this.pc + 2 + uint.asSigned(this.readNextByte()), 12]
        } else {
            return [this.pc + 2, 8]
        }
    }

    bitTest(value: number, bitPlace: number) {
        this.registers.f.zero = ((value >> bitPlace) & 1) == 0
        this.registers.f.subtract = false
        this.registers.f.halfCarry = true
    }

    cp(value: number) {
        this.registers.f.zero = this.registers.a === value
        this.registers.f.subtract = true
        this.registers.f.halfCarry = false // TODO: Set halfCarry
        this.registers.f.carry = this.registers.a < value
    }

    xor(value: number) {
        this.registers.a ^= value
        this.registers.f.zero = this.registers.a === 0
    }

    readNextWord(): number {
        // Gameboy is little endian so read pc + 2 as most significant bit
        // and pc + 1 as least significant bit
        return (this.bus.read(this.pc + 2) << 8) | this.bus.read(this.pc + 1)
    }

    readNextByte(): number {
        return this.bus.read(this.pc + 1)
    }

    push(value: number) {
        const msb = u16.msb(value)  
        this.bus.write(this.sp, msb)
        this.sp -= 1
        const lsb = u16.lsb(value)  
        this.bus.write(this.sp, lsb)
        this.sp -= 1
    }
}

export default CPU