import Registers from './Registers'
import Instruction from './Instruction'
import Bus from './Bus'
import GPU from './GPU'
import { assertExhaustive } from 'typescript'
import u16 from 'lib/u16'
import u8 from 'lib/u8'
import Debugger from 'Debugger'

type Address = number
type Cycles = number
type CPUCallbacks = {
    onPause?: () => void,
    onMaxClockCycles?: () => void,
    onError?: (error: Error) => void
}

export class CPU {
    static get CLOCKS_PER_FRAME(): number { return 70224 } 
    static get CLOCKS_PER_SECOND(): number { return 4194304 } 
    static get START_ADDR(): number { return 0x100 } 
    registers: Registers 
    pc: number
    sp: number
    bus: Bus
    gpu: GPU
    clockTicksInFrame = 0
    clockTicksInSecond = 0
    private _prefix: boolean = false
    private _isRunning: boolean = false
    private _isPaused: boolean = false
    private _hasErrored: boolean = false
    private _onPause: (() => void) | undefined
    private _onError: ((error: Error) => void) | undefined
    private _onMaxClockCycles: (() => void) | undefined

    constructor(bios: Uint8Array | undefined, rom: Uint8Array, callbacks: CPUCallbacks) {
        this.gpu = new GPU()
        this.bus = new Bus(bios, rom, this.gpu)
        this.registers = new Registers()
        this.pc = bios ? 0 : CPU.START_ADDR
        this.sp = 0 
        this._onError = callbacks.onError
        this._onMaxClockCycles = callbacks.onMaxClockCycles
        this._onPause = callbacks.onPause
    }

    get isRunning(): boolean {
        return this._isRunning
    }

    get isPaused(): boolean {
        return this._isPaused
    }

    get hasErrored(): boolean {
        return this._hasErrored
    }
    
    pause () {
        this._isPaused = true
        this._onPause && this._onPause()
    }

    unpause() {
        this._isPaused = false
    }
            
    runFrame(debug?: Debugger): number {
        if (this._isPaused) { return 0 }
        const t1 = new Date().getTime()

        this._isRunning = true
        while (this._isRunning) {
            const pc = this.pc
            if (debug && debug.breakpoints.includes(pc)) {
                this._isRunning = false
                this.pause()
                break
            }

            this.step(pc)

            if (this.clockTicksInFrame > CPU.CLOCKS_PER_FRAME) {
                this.clockTicksInFrame = 0
                this._isRunning = false
                break
            }
            if (this.clockTicksInSecond > CPU.CLOCKS_PER_SECOND) { 
                this.clockTicksInSecond = 0
                this._onMaxClockCycles && this._onMaxClockCycles()
                break
            }
        }
        const t2 = new Date().getTime()
        return t2 - t1
    }

    step(pc: number = this.pc) {
        try {
            const instructionByte = this.bus.read(pc)
            const instruction = Instruction.fromByte(instructionByte, this._prefix)
            const [nextPC, cycles] = this.execute(instruction)

            this.gpu.step(cycles)

            this.clockTicksInFrame += cycles
            this.clockTicksInSecond += cycles

            this.pc = nextPC
        } catch (e) {
            console.error(e)
            this._isRunning = false
            this._onError && this._onError(e)
            this._hasErrored = true
            return
        }

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
                const [result, carry] = u16.overflowingAdd(this.registers.hl, this.registers.bc)
                this.registers.hl = result
                this.registers.f.subtract = false
                this.registers.f.halfCarry = false // TODO: Set halfCarry
                this.registers.f.carry = carry
                return [this.pc + 1, 8]
            case 'CP':
                // WHEN: n is d8
                // 2  8
                // WHEN: n is (HL)
                // 1  8
                // OTHERWISE: 
                // 1  4
                // Z 1 H C
                switch (instruction.n) {
                    case 'A':
                        this.cp(this.registers.a)
                        return [this.pc + 1, 4]
                    case 'B':
                        this.cp(this.registers.b)
                        return [this.pc + 1, 4]
                    case 'C':
                        this.cp(this.registers.c)
                        return [this.pc + 1, 4]
                    case 'D':
                        this.cp(this.registers.d)
                        return [this.pc + 1, 4]
                    case 'E':
                        this.cp(this.registers.e)
                        return [this.pc + 1, 4]
                    case 'H':
                        this.cp(this.registers.h)
                        return [this.pc + 1, 4]
                    case 'L':
                        this.cp(this.registers.l)
                        return [this.pc + 1, 4]
                    case '(HL)':
                        this.cp(this.bus.read(this.registers.hl))
                        return [this.pc + 1, 8]
                    case 'd8':
                        this.cp(this.readNextByte())
                        return [this.pc + 2, 8]
                    default: 
                        assertExhaustive(instruction.n)
                }
            case 'XOR A':
                // 1  4
                // Z 0 0 0
                this.xor(this.registers.a)
                return [this.pc + 1, 4]
            case 'RLA':
                // 1  4
                // 0 0 0 C
                this.registers.a = this.rotateLeft(this.registers.a, false)
                return [this.pc + 1, 4]
            case 'DEC A':
                // 1  4
                // Z 1 H -
                this.registers.a = this.dec(this.registers.a)
                return [this.pc + 1, 4]
            case 'DEC B':
                // 1  4
                // Z 1 H -
                this.registers.b = this.dec(this.registers.b)
                return [this.pc + 1, 4]
            case 'DEC C':
                // 1  4
                // Z 1 H -
                this.registers.c = this.dec(this.registers.c)
                return [this.pc + 1, 4]
            case 'DEC D':
                // 1  4
                // Z 1 H -
                this.registers.d = this.dec(this.registers.d)
                return [this.pc + 1, 4]
            case 'DEC E':
                // 1  4
                // Z 1 H -
                this.registers.e = this.dec(this.registers.e)
                return [this.pc + 1, 4]
            case 'INC':
                // WHEN: target is 16 bit register
                // 1  8
                // - - - -
                // WHEN: target is (HL)
                // 1  12
                // ELSE: 
                // 1  4
                // Z 0 H -
                switch (instruction.target) {
                    case 'A':
                        this.registers.a = this.inc(this.registers.a)
                        return [this.pc + 1, 4]
                    case 'B':
                        this.registers.b = this.inc(this.registers.b)
                        return [this.pc + 1, 4]
                    case 'C':
                        this.registers.c = this.inc(this.registers.c)
                        return [this.pc + 1, 4]
                    case 'D':
                        this.registers.d = this.inc(this.registers.d)
                        return [this.pc + 1, 4]
                    case 'E':
                        this.registers.e = this.inc(this.registers.e)
                        return [this.pc + 1, 4]
                    case 'H':
                        this.registers.h = this.inc(this.registers.h)
                        return [this.pc + 1, 4]
                    case 'L':
                        this.registers.l = this.inc(this.registers.l)
                        return [this.pc + 1, 4]
                    case 'BC':
                        this.registers.bc = u16.wrappingAdd(this.registers.bc, 1)
                        return [this.pc + 1, 8]
                    case 'DE':
                        this.registers.de = u16.wrappingAdd(this.registers.de, 1)
                        return [this.pc + 1, 8]
                    case 'HL':
                        this.registers.hl = u16.wrappingAdd(this.registers.hl, 1)
                        return [this.pc + 1, 8]
                    case 'SP':
                        this.sp = u16.wrappingAdd(this.sp, 1)
                        return [this.pc + 1, 8]
                    case '(HL)':
                        this.bus.write(this.registers.hl, this.inc(this.bus.read(this.registers.hl)))
                        return [this.pc + 1, 12]
                    default:
                        assertExhaustive(instruction)
                }
            case 'AND':
                // WHEN: instruction.n is (hl)
                // 1  8
                // WHEN: instruction.n is d8
                // 2  8
                // ELSE: 
                // 1  4
                // Z 0 1 0
                switch (instruction.n) {
                    case 'A':
                        this.registers.a = this.and(this.registers.a)
                        break
                    case 'B':
                        this.registers.a = this.and(this.registers.b)
                        break
                    case 'C':
                        this.registers.a = this.and(this.registers.c)
                        break
                    case 'D':
                        this.registers.a = this.and(this.registers.d)
                        break
                    case 'E':
                        this.registers.a = this.and(this.registers.e)
                        break
                    case 'H':
                        this.registers.a = this.and(this.registers.h)
                        break
                    case 'L':
                        this.registers.a = this.and(this.registers.l)
                        break
                    case '(HL)':
                        this.registers.a = this.and(this.bus.read(this.registers.hl))
                        break
                    case 'd8': 
                        this.registers.a = this.and(this.readNextByte())
                        break
                    default: 
                        assertExhaustive(instruction.n)
                }
                if (instruction.n === 'd8') {
                    return [this.pc + 2, 8]
                } else if (instruction.n === '(HL)') {
                    return [this.pc + 1, 8]
                } else {
                    return [this.pc + 1, 4]
                }
            case 'SUB':
                // WHEN: instruction.n is (hl)
                // 1  8
                // WHEN: instruction.n is d8
                // 2  8
                // ELSE: 
                // 1  4
                // Z 1 H C
                switch (instruction.n) {
                    case 'A':
                        this.registers.a = this.sub(this.registers.a)
                        break
                    case 'B':
                        this.registers.a = this.sub(this.registers.b)
                        break
                    case 'C':
                        this.registers.a = this.sub(this.registers.c)
                        break
                    case 'D':
                        this.registers.a = this.sub(this.registers.d)
                        break
                    case 'E':
                        this.registers.a = this.sub(this.registers.e)
                        break
                    case 'H':
                        this.registers.a = this.sub(this.registers.h)
                        break
                    case 'L':
                        this.registers.a = this.sub(this.registers.l)
                        break
                    case '(HL)':
                        this.registers.a = this.sub(this.bus.read(this.registers.hl))
                        break
                    case 'd8': 
                        this.registers.a = this.sub(this.readNextByte())
                        break
                    default: 
                        assertExhaustive(instruction.n)
                }
                if (instruction.n === 'd8') {
                    return [this.pc + 2, 8]
                } else if (instruction.n === '(HL)') {
                    return [this.pc + 1, 8]
                } else {
                    return [this.pc + 1, 4]
                }
            case 'ADD A,(HL)':
                // 1  8
                // Z 0 H C
                this.registers.a = this.add(this.bus.read(this.registers.hl))
                return [this.pc + 1, 4]

            case 'JP': 
                // 3  16/12
                // - - - -
                switch (instruction.test) {
                    case 'Z':
                        return this.conditionalJump(this.registers.f.zero) 
                    case 'NZ': 
                        return this.conditionalJump(!this.registers.f.zero) 
                    case 'C':
                        return this.conditionalJump(this.registers.f.carry) 
                    case 'NC':
                        return this.conditionalJump(!this.registers.f.carry) 
                    case true:
                        return this.conditionalJump(true)
                }
            case 'JR':
                // 2  12/8 
                // - - - -
                switch (instruction.test) {
                    case 'Z':
                        return this.conditionalJumpRelative(this.registers.f.zero) 
                    case 'NZ': 
                        return this.conditionalJumpRelative(!this.registers.f.zero) 
                    case 'C':
                        return this.conditionalJumpRelative(this.registers.f.carry) 
                    case 'NC':
                        return this.conditionalJumpRelative(!this.registers.f.carry) 
                    case true:
                        return this.conditionalJumpRelative(true)
                    default: 
                        assertExhaustive(instruction.test)
                }
            case 'CALL a16':
                // 3  24
                // - - - -
                this.push(this.pc + 3)
                return [this.readNextWord(), 24]
            case 'RET':
                // 1  16
                // - - - -
                const ret = this.pop()
                return [ret, 16]

            case 'LD A,d8':
                // 2  8
                // - - - -
                this.registers.a = this.readNextByte()
                return [this.pc + 2, 8]
            case 'LD D,d8':
                // 2  8
                // - - - -
                this.registers.d = this.readNextByte()
                return [this.pc + 2, 8]
            case 'LD E,d8':
                // 2  8
                // - - - -
                this.registers.e = this.readNextByte()
                return [this.pc + 2, 8]
            case 'LD L,d8':
                // 2  8
                // - - - -
                this.registers.l = this.readNextByte()
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
            case 'LDH A,(a8)':
                // 2  12
                // - - - -
                this.registers.a = this.bus.read(0xff00 + this.readNextByte()) // TODO: wrap
                return [this.pc + 2, 12]
            case 'LD Word':
                // 3  12
                // - - - -
                const word = this.readNextWord()
                switch (instruction.target) {
                    case 'BC':
                        this.registers.bc = word
                        break
                    case 'DE':
                        this.registers.de = word
                        break
                    case 'HL':
                        this.registers.hl = word
                        break
                    case 'SP':
                        this.sp = word
                        break
                    default:
                        assertExhaustive(instruction)

                }
                return [this.pc + 3, 12]
            case 'LD (HL+),A':
                // 1  8
                // - - - -
                this.bus.write(this.registers.hl, this.registers.a)
                this.registers.hl = u16.wrappingAdd(this.registers.hl, 1)
                return [this.pc + 1, 8]
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
                // 1  8
                // - - - -
                this.bus.write(0xff00 + this.registers.c, this.registers.a)
                return [this.pc + 1, 8]
            case 'LD (HL),A':
                // 1  8
                // - - - -
                this.bus.write(this.registers.hl, this.registers.a)
                return [this.pc + 1, 8]
            case 'LD A From Indirect':
                // WHEN: instruction.source is (C)
                // 2  8
                // WHEN: instruction.source is (a16)
                // 3  16
                // ELSE: 
                // 1  8
                // - - - -
                switch (instruction.source) {
                    case '(BC)':
                        this.registers.a = this.bus.read(this.registers.bc)
                        return [this.pc + 1, 8]
                    case '(DE)':
                        this.registers.a = this.bus.read(this.registers.de)
                        return [this.pc + 1, 8]
                    case '(HL)':
                        this.registers.a = this.bus.read(this.registers.hl)
                        return [this.pc + 1, 8]
                    case '(HL+)':
                        this.registers.a = this.bus.read(this.registers.hl)
                        this.registers.hl++
                        return [this.pc + 1, 8]
                    case '(HL-)':
                        this.registers.a = this.bus.read(this.registers.hl)
                        this.registers.hl--
                        return [this.pc + 1, 8]
                    case '(C)':
                        this.registers.a = this.bus.read(0xff00 + this.registers.c)
                        return [this.pc + 2, 8]
                    case '(a16)':
                        this.registers.a = this.bus.read(this.readNextWord())
                        return [this.pc + 3, 16]
                    default: 
                        assertExhaustive(instruction.source)
                }
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
            case 'LD A,B':
                // 1  4
                // - - - -
                this.registers.a = this.registers.b
                return [this.pc + 1, 4]
            case 'LD A,E':
                // 1  4
                // - - - -
                this.registers.a = this.registers.e
                return [this.pc + 1, 4]
            case 'LD A,L':
                // 1  4
                // - - - -
                this.registers.a = this.registers.l
                return [this.pc + 1, 4]
            case 'LD A,H':
                // 1  4
                // - - - -
                this.registers.a = this.registers.h
                return [this.pc + 1, 4]
            case 'LD H,A':
                // 1  4
                // - - - -
                this.registers.h = this.registers.a
                return [this.pc + 1, 4]
            case 'LD D,A':
                // 1  4
                // - - - -
                this.registers.d = this.registers.a
                return [this.pc + 1, 4]

            case 'PUSH BC':
                // 1  16
                // - - - -
                this.push(this.registers.bc)
                return [this.pc + 1, 16]
            case 'POP BC':
                // 1  12
                // - - - -
                this.registers.bc = this.pop()
                return [this.pc +1, 12]
            
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

    add(value: number): number {
        const [add, carry] = u8.overflowingAdd(this.registers.a, value)
        this.registers.f.zero = add === 0
        this.registers.f.subtract = false
        this.registers.f.carry = carry
        this.registers.f.halfCarry = false // TODO: set properly
        return add
    }

    sub(value: number): number {
        const [sub, carry] = u8.overflowingSub(this.registers.a, value)
        this.registers.f.zero = sub === 0
        this.registers.f.subtract = true
        this.registers.f.carry = carry
        this.registers.f.halfCarry = false // TODO: set properly
        return sub
    }

    and(value: number): number {
        const newValue = this.registers.a & value
        this.registers.f.zero = newValue === 0
        this.registers.f.subtract = false
        this.registers.f.halfCarry = true
        this.registers.f.carry = false
        return newValue
    }

    inc(value: number): number {
        const newValue = u8.wrappingAdd(value, 1)
        this.registers.f.zero = newValue === 0
        this.registers.f.subtract = false
        this.registers.f.halfCarry = false // TODO: set properly
        return newValue
    }

    dec(value: number): number {
        const newValue = u8.wrappingSub(value, 1)
        this.registers.f.zero = newValue === 0
        this.registers.f.subtract = true
        this.registers.f.halfCarry = false // TODO: set properly
        return newValue
    }

    rotateLeft(value: number, setZero: boolean): number {
        const carry = this.registers.f.carry ? 1 : 0
        const newValue = ((value << 1) | carry) & 0xFF
        this.registers.f.carry = (value & 0x80) !== 0
        this.registers.f.zero = setZero && (newValue === 0)
        this.registers.f.halfCarry = false 
        this.registers.f.subtract = false
        return newValue
    }

    conditionalJump(condition: boolean): [Address, Cycles] {
        if (condition) {
            return [this.readNextWord(), 16]
        } else {
            return [this.pc + 3, 12]
        }
    }

    conditionalJumpRelative(condition: boolean): [Address, Cycles] {
        if (condition) {
            return [this.pc + 2 + u8.asSigned(this.readNextByte()), 12]
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
        this.sp -= 1 // TODO: Wrapping
        const msb = u16.msb(value)  
        this.bus.write(this.sp, msb)

        this.sp -= 1
        const lsb = u16.lsb(value)  
        this.bus.write(this.sp, lsb)
    }

    pop(): number {
        const lsb = this.bus.read(this.sp)
        this.sp += 1 // TODO: Wrapping

        const msb = this.bus.read(this.sp)
        this.sp += 1

        const value = (msb << 8) | lsb
        return value
    }
}

export default CPU