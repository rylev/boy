import Registers from './Registers'
import Instruction from './Instruction'
import Bus from './Bus'
import GPU from './GPU'
import Joypad from './Joypad'
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
    private _isHalted: boolean = false
    private _hasErrored: boolean = false
    private _onPause: (() => void) | undefined
    private _onError: ((error: Error) => void) | undefined
    private _onMaxClockCycles: (() => void) | undefined
    private _interruptsEnabled: boolean = true

    constructor(bios: Uint8Array | undefined, rom: Uint8Array, joypad: Joypad = new Joypad(), callbacks: CPUCallbacks = {}) {
        this.gpu = new GPU()
        this.bus = new Bus(bios, rom, this.gpu, joypad)
        this.registers = new Registers()
        this.pc = bios ? 0 : CPU.START_ADDR
        this.sp = bios ? 0 : 0xfffe
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
            this.bus.step(cycles)

            this.clockTicksInFrame += cycles
            this.clockTicksInSecond += cycles

            if (this._isHalted && this.bus.interruptFlag.any) {
                this._isHalted = false
            } 
            if (!this._isHalted) { this.pc = nextPC }
            if (this._interruptsEnabled) {
                if (this.bus.interruptEnable.vblank && this.bus.interruptFlag.vblank) {
                    this.bus.interruptFlag.vblank = false
                    this.interrupt(Bus.VBLANK_VECTOR)
                }
                if (this.bus.interruptEnable.timer && this.bus.interruptFlag.timer) {
                    this.bus.interruptFlag.timer = false
                    this.interrupt(Bus.TIMER_VECTOR)
                }
            }
        } catch (e) {
            console.error(e)
            this._isRunning = false
            this._onError && this._onError(e)
            this._hasErrored = true
            return
        }

    }

    interrupt(location: number) {
        this._interruptsEnabled = false
        this.push(this.pc)
        this.pc = location
        this.clockTicksInFrame += 12
    }

    execute(instruction: Instruction): [Address, Cycles] {
        // OPCodes Map: http://pastraiser.com/cpu/gameboy/gameboy_opcodes.html
        // OPCodes Explanation: http://www.chrisantonellis.com/files/gameboy/gb-instructions.txt
        this._prefix = false
        switch (instruction.type) {
            case 'HALT':
                // 1  4
                // - - - -
                this._isHalted = true
                return [this.pc + 1, 4]
            case 'NOP':
                // 1  4
                // - - - -
                return [this.pc + 1, 4]
            case 'DI':
                // 1  4
                // - - - -
                this._interruptsEnabled = false
                return [this.pc + 1, 4]
            case 'EI':
                // 1  4
                // - - - -
                this._interruptsEnabled = true
                return [this.pc + 1, 4]
            case 'RETI':
                // 1  16
                // - - - -
                this._interruptsEnabled = true
                const retiPC = this.pop()
                return [retiPC, 16]
            case 'PREFIX CB':
                // 1  4
                // - - - -
                this._prefix = true
                return [this.pc + 1, 4]

            case 'ADD HL':
                // 1  8
                // - 0 H C
                let value
                switch (instruction.n) {
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
            case 'RLC A':
                // 1  4
                // 0 0 0 C
                this.registers.a = this.rlc(this.registers.a, false)
                return [this.pc + 1, 4]
            case 'RRC A':
                // 1  4
                // 0 0 0 C
                this.registers.a = this.rrc(this.registers.a, false)
                return [this.pc + 1, 4]
            case 'DAA':
                // 1  4
                // Z - 0 C
                this.registers.a = this.decimalAdjust(this.registers.a)
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
                switch (instruction.n) {
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
                switch (instruction.n) {
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
            case 'ADD SP':
                // 2  16
                // 0 0 H C
                const r = (u8.asSigned(this.readNextByte()) >>> 0) & 0xffff
                const addspResult = u16.wrappingAdd(this.sp, r)
                this.registers.f.zero = false
                this.registers.f.subtract = false
                // Half and whole carry are computed at the nibble and byte level instead
                // of the byte and word level like you might expect for 16 bit values
                const halfCarryMask = 0xf
                this.registers.f.halfCarry = (this.sp & halfCarryMask) + (r & halfCarryMask) > halfCarryMask
                const carryMask = 0xff
                this.registers.f.carry = (this.sp & carryMask) + (r & carryMask) > carryMask
                this.sp = addspResult
                return [this.pc + 2, 16]
            case 'CPL':
                // 1  4
                // - 1 1 -
                this.registers.a = (~(this.registers.a) & 0xff)
                this.registers.f.halfCarry = true
                this.registers.f.subtract = true
                return [this.pc + 1, 4]
            case 'CCF':
                // 1  4
                // - 0 0 C
                this.registers.f.carry = !this.registers.f.carry
                this.registers.f.halfCarry = false
                this.registers.f.subtract = false
                return [this.pc + 1, 4]
            case 'SCF':
                // 1  4
                // - 0 0 1
                this.registers.f.carry = true
                this.registers.f.halfCarry = false
                this.registers.f.subtract = false
                return [this.pc + 1, 4]
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
            case 'SUBC':
                // WHEN: instruction.n is (hl)
                // 1  8
                // WHEN: instruction.n is d8
                // 2  8
                // ELSE: 
                // 1  4
                // Z 1 H C
                switch (instruction.n) {
                    case 'A':
                        this.registers.a = this.sub(this.registers.a, true)
                        break
                    case 'B':
                        this.registers.a = this.sub(this.registers.b, true)
                        break
                    case 'C':
                        this.registers.a = this.sub(this.registers.c, true)
                        break
                    case 'D':
                        this.registers.a = this.sub(this.registers.d, true)
                        break
                    case 'E':
                        this.registers.a = this.sub(this.registers.e, true)
                        break
                    case 'H':
                        this.registers.a = this.sub(this.registers.h, true)
                        break
                    case 'L':
                        this.registers.a = this.sub(this.registers.l, true)
                        break
                    case '(HL)':
                        this.registers.a = this.sub(this.bus.read(this.registers.hl), true)
                        break
                    case 'd8': 
                        this.registers.a = this.sub(this.readNextByte(), true)
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
            case 'JP (HL)':
                // 1  4
                // - - - -
                return [this.registers.hl, 4]
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
            case 'RST':
                // 1  16
                // - - - -
                return this.rst(instruction.location)
            case 'RET':
                // WHEN: condition is constant true
                // 1  16
                // ELSE:
                // 1  20/8
                // - - - -
                let retCondition 
                switch (instruction.test) {
                    case 'Z':
                        retCondition = this.registers.f.zero
                        break
                    case 'C':
                        retCondition = this.registers.f.carry
                        break
                    case 'NZ':
                        retCondition = !this.registers.f.zero
                        break
                    case 'NC':
                        retCondition = !this.registers.f.carry
                        break
                    case true:
                        retCondition = true
                        break
                    default: 
                        retCondition = true
                        assertExhaustive(instruction.test)

                }
                let retPC
                let retCycles
                if (retCondition) {
                    retPC = this.pop()
                    retCycles = instruction.test === true ? 16 : 20
                } else  {
                    retPC = this.pc + 1
                    retCycles = 8
                }
                return [retPC, retCycles]
            case 'LD n,n':
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
                    case '(HL)':
                        this.bus.write(this.registers.hl, source)
                        break
                    default:
                        assertExhaustive(instruction)
                }
                return [nextPC, cycles]
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
            case 'LD nn,d16':
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
            case 'LD (nn),A':
                // WHEN: instruction.source is (C)
                // 2  8
                // WHEN: instruction.source is (a16)
                // 3  16
                // ELSE: 
                // 1  8
                // - - - -
                switch (instruction.target) {
                    case '(BC)':
                        this.bus.write(this.registers.bc, this.registers.a)
                        return [this.pc + 1, 8]
                    case '(DE)':
                        this.bus.write(this.registers.de, this.registers.a)
                        return [this.pc + 1, 8]
                    case '(HL+)':
                        this.bus.write(this.registers.hl, this.registers.a)
                        this.registers.hl = u16.wrappingAdd(this.registers.hl, 1)
                        return [this.pc + 1, 8]
                    case '(HL-)':
                        this.bus.write(this.registers.hl, this.registers.a)
                        this.registers.hl = u16.wrappingSub(this.registers.hl, 1)
                        return [this.pc + 1, 8]
                    case '(C)':
                        this.bus.write(0xff00 + this.registers.c, this.registers.a)
                        return [this.pc + 1, 8]
                    case '(a16)':
                        this.bus.write(this.readNextWord(), this.registers.a)
                        return [this.pc + 3, 16]
                    default: 
                        assertExhaustive(instruction)
                }
            case 'LD A,(nn)':
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
                        return [u16.wrappingAdd(this.pc, 1), 8]
                    case '(DE)':
                        this.registers.a = this.bus.read(this.registers.de)
                        return [this.pc + 1, 8]
                    case '(HL+)':
                        this.registers.a = this.bus.read(this.registers.hl)
                        this.registers.hl = u16.wrappingAdd(this.registers.hl, 1)
                        return [this.pc + 1, 8]
                    case '(HL-)':
                        this.registers.a = this.bus.read(this.registers.hl)
                        this.registers.hl = u16.wrappingSub(this.registers.hl, 1)
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
            case 'LD (a16),SP':
                // 3  20
                // - - - -
                const address = this.readNextWord()
                this.bus.write(address, u16.lsb(this.sp))
                this.bus.write(u16.wrappingAdd(address,1), u16.msb(this.sp))
                return [this.pc + 3, 20]
            case 'LDHL SP,n':
                // 2  12
                // 0 0 H C
                const n = u8.asSigned(this.readNextByte())
                const spnResult = u16.wrappingAdd(this.sp, n)
                this.registers.hl = spnResult
                this.registers.f.zero = false
                this.registers.f.subtract = false
                // Half and whole carry are computed at the nibble and byte level instead
                // of the byte and word level like you might expect for 16 bit values
                this.registers.f.halfCarry = (this.sp & 0xf) + (n & 0xf) > 0xf
                this.registers.f.carry = (this.sp & 0xff) + (n & 0xff) > 0xff
                return [this.pc + 2, 12]
            case 'LD SP,HL':
                // 1  8
                // - - - -
                this.sp = this.registers.hl
                return [this.pc + 1, 8]

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
                return [this.pc + 1, 12]
            
            case 'SRL':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 C
                return this.cpInstruction(instruction.n, this.srl)
            case 'RR':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 C
                return this.cpInstruction(instruction.n, this.rr)
            case 'SWAP':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 0
                return this.cpInstruction(instruction.n, this.swap)
            case 'RLC':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 0
                return this.cpInstruction(instruction.n, this.rlc)
            case 'RRC':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 0
                return this.cpInstruction(instruction.n, this.rrc)
            case 'RL':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 0
                return this.cpInstruction(instruction.n, (value: number) => this.rotateLeft(value, true))
            case 'SLA':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 0
                return this.cpInstruction(instruction.n, this.sla)
            case 'SRA':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 0
                return this.cpInstruction(instruction.n, this.sra)
            case 'BIT':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 0
                return this.cpInstruction(instruction.n, (value: number) => this.bitTest(value, instruction.bitPosition), false)
            case 'RES':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 0
                return this.cpInstruction(instruction.n, (value: number) => this.res(value, instruction.bitPosition))
            case 'SET':
                // WHEN: n is (HL)
                // 2  16
                // ELSE:
                // 2  8
                // Z 0 0 0
                return this.cpInstruction(instruction.n, (value: number) => this.set(value, instruction.bitPosition))
            default:
                return assertExhaustive(instruction)
        }
    }

    cpInstruction(n: 'A' | 'B' | 'C' | 'D' | 'E' | 'H' | 'L' | '(HL)', processor: (value: number) => number, write: boolean = true): [number, number] {
        processor = processor.bind(this)
        switch (n) {
            case 'A':
                const a = processor(this.registers.a)
                if (write) { this.registers.a = a }
                break
            case 'B':
                const b = processor(this.registers.b)
                if (write) { this.registers.b = b }
                break
            case 'C':
                const c = processor(this.registers.c)
                if (write) { this.registers.c = c }
                break
            case 'D':
                const d = processor(this.registers.d)
                if (write) { this.registers.d = d }
                break
            case 'E':
                const e = processor(this.registers.e)
                if (write) { this.registers.e = e }
                break
            case 'H':
                const h = processor(this.registers.h)
                if (write) { this.registers.h = h }
                break
            case 'L':
                const l = processor(this.registers.l)
                if (write) { this.registers.l = l }
                break
            case '(HL)':
                const hl = processor(this.bus.read(this.registers.hl))
                if (write) { this.bus.write(this.registers.hl, hl) }
                break
            default:
                assertExhaustive(n)
        }
        if (n === '(HL)') {
            return [this.pc + 1, 8]
        } else {
            return [this.pc + 1, 4]
        }
    }

    add(value: number, addCarry: boolean = false): number {
        const additionalCarry = addCarry && this.registers.f.carry ? 1 : 0
        let [add, carry] = u8.overflowingAdd(this.registers.a, value)
        const [add2, carry2] = u8.overflowingAdd(add, additionalCarry)
        this.registers.f.zero = add2 === 0
        this.registers.f.subtract = false
        this.registers.f.carry = carry || carry2
        this.registers.f.halfCarry = ((this.registers.a & 0xf) + (value & 0xf) + additionalCarry) > 0xf
        return add2
    }

    addHL(value: number) {
        const [result, carry] = u16.overflowingAdd(this.registers.hl, value)
        this.registers.f.subtract = false
        // Half carry tests if we flow over the 11th bit i.e. does adding the two 
        // numbers together cause the 11th bit to flip
        const mask = 0b11111111111
        this.registers.f.halfCarry = (value & mask) + (this.registers.hl & mask) > mask
        this.registers.f.carry = carry

        this.registers.hl = result
    }

    sub(value: number, addCarry: boolean = false): number {
        const additionalCarry = addCarry && this.registers.f.carry ? 1 : 0
        const [sub1, carry1] = u8.overflowingSub(this.registers.a, value)
        const [sub2, carry2] = u8.overflowingSub(sub1, additionalCarry)
        this.registers.f.zero = sub2 === 0
        this.registers.f.subtract = true
        this.registers.f.carry = carry1 || carry2
        this.registers.f.halfCarry = ((this.registers.a & 0xf) - (value & 0xf) - additionalCarry) < 0
        return sub2
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

    sla(value: number): number {
        const carry = (value & 0x80) >> 7 
        const newValue = (value << 1) & 0xff
        this.registers.f.zero = newValue === 0
        this.registers.f.subtract = false
        this.registers.f.halfCarry = false
        this.registers.f.carry = carry === 1 
        return newValue
    }

    sra(value: number): number {
        const msb = value & 0x80
        const carry = value & 0b1 
        const newValue = (value >> 1) | msb
        this.registers.f.zero = newValue === 0
        this.registers.f.subtract = false
        this.registers.f.halfCarry = false
        this.registers.f.carry = carry === 1 
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

    swap(value: number): number {
        const newValue = ((value & 0xf) << 4) | ((value & 0xf0) >> 4)
        this.registers.f.zero = newValue === 0
        this.registers.f.subtract = false
        this.registers.f.halfCarry = false
        this.registers.f.carry = false
        return newValue
    }

    rlc(value: number, setZero: boolean = true): number {
        const carry = (value & 0x80) >> 7
        const newValue = ((value << 1) & 0xff) | carry
        this.registers.f.zero = setZero && newValue === 0
        this.registers.f.subtract = false
        this.registers.f.halfCarry = false
        this.registers.f.carry = carry === 1
        return newValue
    }

    rrc(value: number, setZero: boolean = true): number {
        const carry = value & 0b1 
        const newValue = (value >> 1) | (carry << 7)
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
        this.registers.f.halfCarry = ((value & 0xf) + 1) > 0xf
        return newValue
    }

    dec(value: number): number {
        const newValue = u8.wrappingSub(value, 1)
        this.registers.f.zero = newValue === 0
        this.registers.f.subtract = true
        this.registers.f.halfCarry = ((value & 0xf) - 1) < 0
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
            return [u16.wrappingAdd(this.pc, 3), 12]
        }
    }

    conditionalJumpRelative(condition: boolean): [Address, Cycles] {
        if (condition) {
            const nextStep = u16.wrappingAdd(this.pc, 2)
            const offset = u8.asSigned(this.readNextByte())
            if (offset >= 0) {
                return [u16.wrappingAdd(nextStep, offset), 12]
            } else {
                return [u16.wrappingSub(nextStep, Math.abs(offset)), 12]
            }
        } else {
            return [u16.wrappingAdd(this.pc, 2), 8]
        }
    }

    rst(location: number): [Address, Cycles] {
        this.push(u16.wrappingAdd(this.pc, 1))
        return [location, 24]
    }

    call(condition: boolean): [Address, Cycles] {
        if (condition) {
            this.push(u16.wrappingAdd(this.pc, 3))
            return [this.readNextWord(), 24]
        } else {
            return [u16.wrappingAdd(this.pc, 3), 12]
        }
    }

    bitTest(value: number, bitPlace: number) {
        const result = ((value >> bitPlace) & 1) 
        this.registers.f.zero = result == 0
        this.registers.f.subtract = false
        this.registers.f.halfCarry = true
        return result
    }

    res(value: number, bitPlace: number) {
        const result = value & (~(1 << bitPlace) & 0xff)
        return result
    }

    set(value: number, bitPlace: number) {
        const result = value | ((1 << bitPlace) & 0xff)
        return result
    }

    cp(value: number) {
        this.registers.f.zero = this.registers.a === value
        this.registers.f.subtract = true
        this.registers.f.halfCarry = (this.registers.a & 0xf) - (value & 0xf) < 0
        this.registers.f.carry = this.registers.a < value
    }

    xor(value: number) {
        this.registers.a ^= value
        this.registers.f.zero = this.registers.a === 0
        this.registers.f.subtract = false
        this.registers.f.carry = false
        this.registers.f.halfCarry = false
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
        this.sp = u16.wrappingSub(this.sp, 1) 
        const msb = u16.msb(value)  
        this.bus.write(this.sp, msb)

        this.sp = u16.wrappingSub(this.sp, 1) 
        const lsb = u16.lsb(value)  
        this.bus.write(this.sp, lsb)
    }

    pop(): number {
        const lsb = this.bus.read(this.sp)
        this.sp = u16.wrappingAdd(this.sp, 1) 

        const msb = this.bus.read(this.sp)
        this.sp = u16.wrappingAdd(this.sp, 1) 

        const value = (msb << 8) | lsb
        return value
    }

    decimalAdjust(value: number): number {
        // Huge help from: https://github.com/Gekkio/mooneye-gb/blob/04ea55869b9d1587b36e35b204930a30abd186f5/src/cpu/mod.rs#L773-L797
        let result = value
        let carryResult = false
        if (!this.registers.f.subtract) {
            if (this.registers.f.carry || value > 0x99) {
                result = u8.wrappingAdd(result, 0x60)
                carryResult = true
            }
            if (this.registers.f.halfCarry || ((value & 0xf) > 0x9)) {
                result = u8.wrappingAdd(result, 0x6)
            }
        } else if (this.registers.f.carry) {
            carryResult = true
            result = u8.wrappingAdd(result, this.registers.f.halfCarry ? 0x9a : 0xa0)
        } else if (this.registers.f.halfCarry) {
            result = u8.wrappingAdd(result, 0xfa)
        }

        this.registers.f.carry = carryResult
        this.registers.f.zero = result === 0
        this.registers.f.halfCarry = false

        return result
    }
}

export default CPU