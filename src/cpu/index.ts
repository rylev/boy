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

            case 'ADD HL':
                // 1  8
                // - 0 H C
                let value
                switch (instruction.source) {
                    case 'BC':
                        value = this.registers.bc
                        break
                    case 'DE':
                        value = this.registers.de
                        break
                    case 'HL':
                        value = this.registers.hl
                        break
                    case 'SP':
                        value = this.sp
                        break
                    default: 
                        value = 0
                        assertExhaustive(instruction)
                }
                this.addHL(value)
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
                        assertExhaustive(instruction)
                }
            case 'XOR':
                // WHEN: n is d8
                // 2  8
                // WHEN: n is (HL)
                // 1  8
                // OTHERWISE: 
                // 1  4
                // Z 0 0 0
                switch (instruction.n) {
                    case 'A':
                        this.xor(this.registers.a)
                        return [this.pc + 1, 4]
                    case 'B':
                        this.xor(this.registers.b)
                        return [this.pc + 1, 4]
                    case 'C':
                        this.xor(this.registers.c)
                        return [this.pc + 1, 4]
                    case 'D':
                        this.xor(this.registers.d)
                        return [this.pc + 1, 4]
                    case 'E':
                        this.xor(this.registers.e)
                        return [this.pc + 1, 4]
                    case 'H':
                        this.xor(this.registers.h)
                        return [this.pc + 1, 4]
                    case 'L':
                        this.xor(this.registers.l)
                        return [this.pc + 1, 4]
                    case '(HL)':
                        this.xor(this.bus.read(this.registers.hl))
                        return [this.pc + 1, 8]
                    case 'd8':
                        this.xor(this.readNextByte())
                        return [this.pc + 2, 8]
                    default: 
                        assertExhaustive(instruction)
                }
            case 'RLA':
                // 1  4
                // 0 0 0 C
                this.registers.a = this.rotateLeft(this.registers.a, false)
                return [this.pc + 1, 4]
            case 'DEC':
                // WHEN: target is 16 bit register
                // 1  8
                // - - - -
                // WHEN: target is (HL)
                // 1  12
                // ELSE: 
                // 1  4
                // Z 1 H -
                switch (instruction.target) {
                    case 'A':
                        this.registers.a = this.dec(this.registers.a)
                        return [this.pc + 1, 4]
                    case 'B':
                        this.registers.b = this.dec(this.registers.b)
                        return [this.pc + 1, 4]
                    case 'C':
                        this.registers.c = this.dec(this.registers.c)
                        return [this.pc + 1, 4]
                    case 'D':
                        this.registers.d = this.dec(this.registers.d)
                        return [this.pc + 1, 4]
                    case 'E':
                        this.registers.e = this.dec(this.registers.e)
                        return [this.pc + 1, 4]
                    case 'H':
                        this.registers.h = this.dec(this.registers.h)
                        return [this.pc + 1, 4]
                    case 'L':
                        this.registers.l = this.dec(this.registers.l)
                        return [this.pc + 1, 4]
                    case 'BC':
                        this.registers.bc = u16.wrappingSub(this.registers.bc, 1)
                        return [this.pc + 1, 8]
                    case 'DE':
                        this.registers.de = u16.wrappingSub(this.registers.de, 1)
                        return [this.pc + 1, 8]
                    case 'HL':
                        this.registers.hl = u16.wrappingSub(this.registers.hl, 1)
                        return [this.pc + 1, 8]
                    case 'SP':
                        this.sp = u16.wrappingSub(this.sp, 1)
                        return [this.pc + 1, 8]
                    case '(HL)':
                        this.bus.write(this.registers.hl, this.dec(this.bus.read(this.registers.hl)))
                        return [this.pc + 1, 12]
                    default:
                        assertExhaustive(instruction)
                }
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
                        assertExhaustive(instruction)
                }
                if (instruction.n === 'd8') {
                    return [this.pc + 2, 8]
                } else if (instruction.n === '(HL)') {
                    return [this.pc + 1, 8]
                } else {
                    return [this.pc + 1, 4]
                }
            case 'OR':
                // WHEN: n is (hl)
                // 1  8
                // WHEN: n is d8
                // 2  8
                // ELSE: 
                // 1  4
                // Z 0 0 0
                switch (instruction.n) {
                    case 'A':
                        this.registers.a = this.or(this.registers.a)
                        break
                    case 'B':
                        this.registers.a = this.or(this.registers.b)
                        break
                    case 'C':
                        this.registers.a = this.or(this.registers.c)
                        break
                    case 'D':
                        this.registers.a = this.or(this.registers.d)
                        break
                    case 'E':
                        this.registers.a = this.or(this.registers.e)
                        break
                    case 'H':
                        this.registers.a = this.or(this.registers.h)
                        break
                    case 'L':
                        this.registers.a = this.or(this.registers.l)
                        break
                    case '(HL)':
                        this.registers.a = this.or(this.bus.read(this.registers.hl))
                        break
                    case 'd8': 
                        this.registers.a = this.or(this.readNextByte())
                        break
                    default: 
                        assertExhaustive(instruction)
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
                        assertExhaustive(instruction)
                }
                if (instruction.n === 'd8') {
                    return [this.pc + 2, 8]
                } else if (instruction.n === '(HL)') {
                    return [this.pc + 1, 8]
                } else {
                    return [this.pc + 1, 4]
                }
            case 'ADD':
                // WHEN: instruction.n is (hl)
                // 1  8
                // WHEN: instruction.n is d8
                // 2  8
                // ELSE: 
                // 1  4
                // Z 0 H C
                switch (instruction.n) {
                    case 'A':
                        this.registers.a = this.add(this.registers.a)
                        break
                    case 'B':
                        this.registers.a = this.add(this.registers.b)
                        break
                    case 'C':
                        this.registers.a = this.add(this.registers.c)
                        break
                    case 'D':
                        this.registers.a = this.add(this.registers.d)
                        break
                    case 'E':
                        this.registers.a = this.add(this.registers.e)
                        break
                    case 'H':
                        this.registers.a = this.add(this.registers.h)
                        break
                    case 'L':
                        this.registers.a = this.add(this.registers.l)
                        break
                    case '(HL)':
                        this.registers.a = this.add(this.bus.read(this.registers.hl))
                        break
                    case 'd8': 
                        this.registers.a = this.add(this.readNextByte())
                        break
                    default: 
                        assertExhaustive(instruction)
                }
                if (instruction.n === 'd8') {
                    return [this.pc + 2, 8]
                } else if (instruction.n === '(HL)') {
                    return [this.pc + 1, 8]
                } else {
                    return [this.pc + 1, 4]
                }
            case 'ADDC':
                // WHEN: instruction.n is (hl)
                // 1  8
                // WHEN: instruction.n is d8
                // 2  8
                // ELSE: 
                // 1  4
                // Z 0 H C
                switch (instruction.n) {
                    case 'A':
                        this.registers.a = this.add(this.registers.a, true)
                        break
                    case 'B':
                        this.registers.a = this.add(this.registers.b, true)
                        break
                    case 'C':
                        this.registers.a = this.add(this.registers.c, true)
                        break
                    case 'D':
                        this.registers.a = this.add(this.registers.d, true)
                        break
                    case 'E':
                        this.registers.a = this.add(this.registers.e, true)
                        break
                    case 'H':
                        this.registers.a = this.add(this.registers.h, true)
                        break
                    case 'L':
                        this.registers.a = this.add(this.registers.l, true)
                        break
                    case '(HL)':
                        this.registers.a = this.add(this.bus.read(this.registers.hl), true)
                        break
                    case 'd8': 
                        this.registers.a = this.add(this.readNextByte(), true)
                        break
                    default: 
                        assertExhaustive(instruction)
                }
                if (instruction.n === 'd8') {
                    return [this.pc + 2, 8]
                } else if (instruction.n === '(HL)') {
                    return [this.pc + 1, 8]
                } else {
                    return [this.pc + 1, 4]
                }
            case 'RRA':
                this.registers.a = this.rr(this.registers.a, false)
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
                    default: 
                        assertExhaustive(instruction.test)
                        return [0, 0]
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
                        return [0, 0]
                }
            case 'CALL':
                // 3  24/12
                // - - - -
                let condition 
                switch (instruction.test) {
                    case 'Z':
                        condition = this.registers.f.zero
                        break
                    case 'C':
                        condition = this.registers.f.carry
                        break
                    case 'NZ':
                        condition = !this.registers.f.zero
                        break
                    case 'NC':
                        condition = !this.registers.f.carry
                        break
                    case true:
                        condition = true
                        break
                    default: 
                        condition = true
                        assertExhaustive(instruction.test)

                }
                return this.call(condition)
            case 'RET':
                // 1  16
                // - - - -
                const ret = this.pop()
                return [ret, 16]

            case 'LD':
                // WHEN: source is d8
                // 2  8
                // WHEN: source is (HL)
                // 1  8
                // ELSE: 
                // 1  4
                // - - - -
                let source;
                let nextPC
                let cycles
                switch (instruction.source) {
                    case 'A':
                        source = this.registers.a
                        nextPC = this.pc + 1
                        cycles = 4
                        break
                    case 'B':
                        source = this.registers.b
                        nextPC = this.pc + 1
                        cycles = 4
                        break
                    case 'C':
                        source = this.registers.c
                        nextPC = this.pc + 1
                        cycles = 4
                        break
                    case 'D':
                        source = this.registers.d
                        nextPC = this.pc + 1
                        cycles = 4
                        break
                    case 'E':
                        source = this.registers.e
                        nextPC = this.pc + 1
                        cycles = 4
                        break
                    case 'H':
                        source = this.registers.h
                        nextPC = this.pc + 1
                        cycles = 4
                        break
                    case 'L':
                        source = this.registers.l
                        nextPC = this.pc + 1
                        cycles = 4
                        break
                    case '(HL)':
                        source = this.bus.read(this.registers.hl)
                        nextPC = this.pc + 1
                        cycles = 8
                        break
                    case 'd8':
                        source = this.readNextByte()
                        nextPC = this.pc + 2
                        cycles = 8
                        break
                    default:
                        source = 0
                        nextPC = 0
                        cycles = 0
                        assertExhaustive(instruction)
                }
                switch (instruction.target) {
                    case 'A':
                        this.registers.a = source
                        break
                    case 'B':
                        this.registers.b = source
                        break
                    case 'C':
                        this.registers.c = source
                        break
                    case 'D':
                        this.registers.d = source
                        break
                    case 'E':
                        this.registers.e = source
                        break
                    case 'H':
                        this.registers.h = source
                        break
                    case 'L':
                        this.registers.l = source
                        break
                    default:
                        assertExhaustive(instruction)
                }
                return [nextPC, cycles]
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
            case 'LD To Indirect':
                // WHEN: source is d8
                // 2  12
                // ELSE
                // 1  8
                // - - - -
                let ldToIndirectSource
                switch (instruction.source) {
                    case 'A':
                        ldToIndirectSource = this.registers.a
                        break
                    case 'B':
                        ldToIndirectSource = this.registers.b
                        break
                    case 'C':
                        ldToIndirectSource = this.registers.c
                        break
                    case 'D':
                        ldToIndirectSource = this.registers.d
                        break
                    case 'E':
                        ldToIndirectSource = this.registers.e
                        break
                    case 'H':
                        ldToIndirectSource = this.registers.h
                        break
                    case 'L':
                        ldToIndirectSource = this.registers.l
                        break
                    case 'd8':
                        ldToIndirectSource = this.readNextByte()
                        break
                    default:
                        ldToIndirectSource = 0
                        assertExhaustive(instruction)
                    
                    this.bus.write(this.registers.hl, ldToIndirectSource)
                }

                if (instruction.source === 'd8') {
                    return [this.pc + 2, 12]
                } else {
                    return [this.pc + 1, 8]
                }
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
            case 'LD (C),A':
                // 1  8
                // - - - -
                this.bus.write(0xff00 + this.registers.c, this.registers.a)
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
                        assertExhaustive(instruction)
                }

            case 'PUSH':
                // 1  16
                // - - - -
                switch (instruction.source) {
                    case 'AF':
                        this.push(this.registers.af)
                        break
                    case 'BC':
                        this.push(this.registers.bc)
                        break
                    case 'DE':
                        this.push(this.registers.de)
                        break
                    case 'HL':
                        this.push(this.registers.hl)
                        break
                }
                return [this.pc + 1, 16]
            case 'POP':
                // 1  12
                // WHEN: target is AF 
                // Z N H C
                // ELSE:
                // - - - -
                const popResult = this.pop()
                switch (instruction.target) {
                    case 'AF':
                        this.registers.af = popResult
                        break
                    case 'BC':
                        this.registers.bc = popResult
                        break
                    case 'DE':
                        this.registers.de = popResult
                        break
                    case 'HL':
                        this.registers.hl = popResult
                        break
                    default: 
                        assertExhaustive(instruction)
                }
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
            case 'SRL':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 C
                switch (instruction.n) {
                    case 'A':
                        this.registers.a = this.srl(this.registers.a)
                        break
                    case 'B':
                        this.registers.b = this.srl(this.registers.b)
                        break
                    case 'C':
                        this.registers.c = this.srl(this.registers.c)
                        break
                    case 'D':
                        this.registers.d = this.srl(this.registers.d)
                        break
                    case 'E':
                        this.registers.e = this.srl(this.registers.e)
                        break
                    case 'H':
                        this.registers.h = this.srl(this.registers.h)
                        break
                    case 'L':
                        this.registers.l = this.srl(this.registers.l)
                        break
                    case '(HL)':
                        this.bus.write(this.registers.hl, this.srl(this.bus.read(this.registers.hl)))
                        break
                    default: 
                        assertExhaustive(instruction)
                }
                if (instruction.n === '(HL)') {
                    return [this.pc + 1, 8]
                } else {
                    return [this.pc + 1, 4]
                }
            case 'RR':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 C
                switch (instruction.n) {
                    case 'A':
                        this.registers.a = this.rr(this.registers.a)
                        break
                    case 'B':
                        this.registers.b = this.rr(this.registers.b)
                        break
                    case 'C':
                        this.registers.c = this.rr(this.registers.c)
                        break
                    case 'D':
                        this.registers.d = this.rr(this.registers.d)
                        break
                    case 'E':
                        this.registers.e = this.rr(this.registers.e)
                        break
                    case 'H':
                        this.registers.h = this.rr(this.registers.h)
                        break
                    case 'L':
                        this.registers.l = this.rr(this.registers.l)
                        break
                    case '(HL)':
                        this.bus.write(this.registers.hl, this.rr(this.bus.read(this.registers.hl)))
                        break
                    default: 
                        assertExhaustive(instruction)
                }
                if (instruction.n === '(HL)') {
                    return [this.pc + 1, 8]
                } else {
                    return [this.pc + 1, 4]
                }

            default:
                return assertExhaustive(instruction)
        }
    }

    add(value: number, addCarry: boolean = false): number {
        let [add, carry] = u8.overflowingAdd(this.registers.a, value)
        const [add2, carry2] = u8.overflowingAdd(add, addCarry && this.registers.f.carry ? 1 : 0)
        this.registers.f.zero = add2 === 0
        this.registers.f.subtract = false
        this.registers.f.carry = carry || carry2
        this.registers.f.halfCarry = false // TODO: set properly
        return add2
    }

    addHL(value: number) {
        const [result, carry] = u16.overflowingAdd(this.registers.hl, value)
        this.registers.f.subtract = false
        this.registers.f.halfCarry = false // TODO: Set halfCarry
        this.registers.f.carry = carry

        this.registers.hl = result
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

    or(value: number): number {
        const newValue = this.registers.a | value
        this.registers.f.zero = newValue === 0
        this.registers.f.subtract = false
        this.registers.f.halfCarry = false
        this.registers.f.carry = false
        return newValue
    }

    srl(value: number): number {
        const carry = value & 0b1
        const newValue = value >> 1
        this.registers.f.zero = newValue === 0
        this.registers.f.subtract = false
        this.registers.f.halfCarry = false
        this.registers.f.carry = carry === 1
        return newValue
    }

    rr(value: number, setZero: boolean = true): number {
        const carry = value & 0b1
        const newValue = (value >> 1) | (this.registers.f.carry ? 1 : 0) << 7
        this.registers.f.zero = setZero && newValue === 0
        this.registers.f.subtract = false
        this.registers.f.halfCarry = false
        this.registers.f.carry = carry === 1
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

    call(condition: boolean): [Address, Cycles] {
        if (condition) {
            this.push(this.pc + 3)
            return [this.readNextWord(), 24]
        } else {
            return [this.pc + 3, 12]
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