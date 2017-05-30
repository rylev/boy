import { toHex } from 'lib/hex'

type AllRegistersButF = 'A' | 'B' | 'C' | 'D' | 'E' | 'H' | 'L'
type WordRegisters = 'BC' | 'DE' | 'HL'

type JumpTest = 'NZ' | 'NC' | 'Z' | 'C' | true
type JP = { type: 'JP', test: JumpTest }
type JPIndirect = { type: 'JP Indirect' }
type JR = { type: 'JR', test: JumpTest }
type CALL = { type: 'CALL', test: JumpTest }
type RET = { type: 'RET', test: JumpTest }

type Halt = { type: 'HALT' }
type DI = { type: 'DI' }
type NOP = { type: 'NOP' }
type PREFIX = { type: 'PREFIX CB' }

type AddHLSource = 'BC' | 'DE' | 'HL' | 'SP'
type AddHL = { type: 'ADD HL', source: AddHLSource }

type CPN = AllRegistersButF | '(HL)' | 'd8'
type CP = { type: 'CP', n: CPN }

type RLA = { type: 'RLA' }

type INCTarget = AllRegistersButF | WordRegisters | '(HL)' | 'SP'
type INC = { type: 'INC', target: INCTarget }
type DECTarget = INCTarget
type DEC = { type: 'DEC', target: DECTarget }

type ANDN =  AllRegistersButF | '(HL)' | 'd8'
type AND = { type: 'AND', n: ANDN }
type ORN =  ANDN
type OR = { type: 'OR', n: ORN }
type XORN =  ANDN
type XOR = { type: 'XOR', n: XORN }
type ADDN = ANDN
type ADD = { type: 'ADD', n: ADDN }
type ADDCN = ANDN
type ADDC = { type: 'ADDC', n: ADDCN }
type SUBN = ANDN
type SUB = { type: 'SUB', n: SUBN }
type RRA = { type: 'RRA' }

type LDHA_a8_ = { type: 'LDH A,(a8)' }
type LDH_a8_A = { type: 'LDH (a8),A' }

type LDAIndirectSource = '(BC)' | '(DE)' | '(HL-)' | '(HL+)' | '(a16)' | '(C)'
type LDAFromIndirect = { type: 'LD A From Indirect', source: LDAIndirectSource }
type LDAIndirectTarget = '(BC)' | '(DE)' | '(HL-)' | '(HL+)' | '(a16)' | '(C)'
type LDAToIndirect = { type: 'LD A To Indirect', target: LDAIndirectTarget }

type LDIndirectSource = AllRegistersButF | 'd8'
type LDToIndirect = { type: 'LD To Indirect', source: LDIndirectSource }

type LDSource = AllRegistersButF | '(HL)' | 'd8'
type LDTarget = AllRegistersButF  
type LD = { type: 'LD', source: LDSource, target: LDTarget }

type WordTarget = WordRegisters | 'SP'
type LDWord = { type: 'LD Word', target: WordTarget }

type LDHLSPn = { type: 'LDHL SP,n' }

type PUSHSource = 'AF' | 'BC' | 'DE' | 'HL'
type PUSH = { type: 'PUSH', source: PUSHSource }
type POPTarget = PUSHSource
type POP = { type: 'POP', target: POPTarget }

type BIT7H = { type: 'BIT 7,H' }
type RLC = { type: 'RL C' }

type SRLN = AllRegistersButF | '(HL)'
type SRL = { type: 'SRL', n: SRLN }
type RRN = SRLN
type RR = { type: 'RR', n: RRN }
type SWAPN = SRLN
type SWAP = { type: 'SWAP', n: SWAPN }

type JumpInstruction = 
    | JP
    | JPIndirect
    | JR
    | CALL
    | RET

type ControlInstruction = 
    | Halt
    | DI
    | NOP
    | PREFIX
    
type ArithmeticInstruction = 
    | AND
    | OR
    | ADD
    | ADDC
    | SUB
    | INC
    | AddHL
    | XOR
    | CP
    | RLA
    | RRA
    | DEC

type LoadStoreInstruction = 
    | LD
    | LDWord
    | LDAFromIndirect
    | LDAToIndirect
    | LDToIndirect
    | LDH_a8_A
    | LDHA_a8_
    | LDHLSPn

type StackInstruction = 
    | PUSH
    | POP

type PrefixInstruction = 
    | BIT7H
    | RLC
    | SRL
    | RR
    | SWAP

export type Instruction =
    | JumpInstruction
    | ControlInstruction
    | ArithmeticInstruction
    | LoadStoreInstruction
    | StackInstruction
    | PrefixInstruction

export namespace Instruction {
    export const JR = (test: JumpTest ): JR => ({ type: 'JR', test })
    export const JP = (test: JumpTest): JP => ({ type: 'JP', test })
    export const JPIndirect: JPIndirect = { type: 'JP Indirect'}
    export const CALL = (test: JumpTest): CALL => ({ type: 'CALL', test })
    export const RET = (test: JumpTest): RET => ({ type: 'RET', test })

    export const Halt: Halt = { type: 'HALT' }
    export const DI: DI = { type: 'DI' }
    export const NOP: NOP = { type: 'NOP' }
    export const PREFIX: PREFIX = { type: 'PREFIX CB' }

    export const AddHL = (source: AddHLSource): AddHL => ({ type: 'ADD HL', source })
    export const CP = (n: CPN): CP => ({ type: 'CP', n })
    export const XOR = (n: XORN): XOR => ({ type: 'XOR', n })
    export const RLA: RLA = { type: 'RLA' }
    export const INC = (target: INCTarget): INC => ({ type: 'INC', target })
    export const DEC = (target: DECTarget): DEC => ({ type: 'DEC', target })
    export const ADD = (n: ADDN): ADD => ({ type: 'ADD', n })
    export const ADDC = (n: ADDCN): ADDC => ({ type: 'ADDC', n })
    export const AND = (n: ANDN): AND => ({ type: 'AND', n })
    export const OR = (n: ORN): OR => ({ type: 'OR', n })
    export const SUB = (n: SUBN): SUB => ({ type: 'SUB', n })
    export const RRA: RRA = { type: 'RRA' }

    export const LD = (target: AllRegistersButF, source: LDSource): LD => ({ type: 'LD', target, source })
    export const LDWord = (target: WordTarget): LDWord => ({ type: 'LD Word', target })
    export const LDAFromIndirect = (source: LDAIndirectSource): LDAFromIndirect => ({ type: 'LD A From Indirect', source })
    export const LDAToIndirect = (target: LDAIndirectTarget): LDAToIndirect => ({ type: 'LD A To Indirect', target })
    export const LDToIndirect = (source: LDIndirectSource): LDToIndirect => ({ type: 'LD To Indirect', source })
    export const LDHA_a8_: LDHA_a8_ = { type: 'LDH A,(a8)' }
    export const LDH_a8_A: LDH_a8_A = { type: 'LDH (a8),A' }
    export const LDHLSPn: LDHLSPn = { type: 'LDHL SP,n' }

    export const PUSH = (source: PUSHSource): PUSH => ({ type: 'PUSH', source })
    export const POP = (target: POPTarget): POP => ({ type: 'POP', target })

    export const BIT7H: BIT7H = { type: 'BIT 7,H' }
    export const RLC: RLC = { type: 'RL C' }
    export const SRL = (n: SRLN): SRL => ({ type: 'SRL', n })
    export const RR = (n: RRN): RR => ({ type: 'RR', n })
    export const SWAP = (n: SWAPN): SWAP => ({ type: 'SWAP', n })

    export function fromByte(byte: number, prefix: boolean): Instruction {
        const instruction = prefix ? byteToPrefixInstructionMap[byte] : byteToInstructionMap[byte]
        if (instruction == undefined) { 
            const prefixDescription = prefix ? 'CB ' : ''
            throw new Error(`Unexpected OPCode: '${prefixDescription}${toHex(byte)}'`) 
        }
        return instruction
    }

    export function toByte(instruction: Instruction, prefix: boolean = false): number {
        const entries: [string, Instruction][] = prefix ? Object.entries(byteToPrefixInstructionMap) : Object.entries(byteToInstructionMap)
        const entry = entries.find(pair => {
            const [key, value] = pair
            let answer = true
            for (let k of Object.keys(value)) {
                answer = (value as any)[k] === (instruction as any)[k]
                if (!answer) return answer
            }
            return answer
        })
        if (entry == undefined) { throw new Error(`Unexpected instruction: '${instruction.type}'`) }
        return parseInt(entry[0])
    }
}

const byteToInstructionMap: {[index: number]: Instruction | undefined} = {
    0x09: Instruction.AddHL('BC'),
    0x19: Instruction.AddHL('DE'),
    0x29: Instruction.AddHL('HL'),
    0x39: Instruction.AddHL('SP'),

    0xb8: Instruction.CP('B'),
    0xb9: Instruction.CP('C'),
    0xba: Instruction.CP('D'),
    0xbb: Instruction.CP('E'),
    0xbc: Instruction.CP('H'),
    0xbd: Instruction.CP('L'),
    0xbe: Instruction.CP('(HL)'),
    0xbf: Instruction.CP('A'),
    0xfe: Instruction.CP('d8'),

    0x03: Instruction.INC('BC'),
    0x13: Instruction.INC('DE'),
    0x23: Instruction.INC('HL'),
    0x33: Instruction.INC('SP'),
    0x04: Instruction.INC('B'),
    0x14: Instruction.INC('D'),
    0x24: Instruction.INC('H'),
    0x34: Instruction.INC('(HL)'),
    0x0c: Instruction.INC('C'),
    0x1c: Instruction.INC('E'),
    0x2c: Instruction.INC('L'),
    0x3c: Instruction.INC('A'),

    0xa8: Instruction.XOR('B'),
    0xa9: Instruction.XOR('C'),
    0xaa: Instruction.XOR('D'),
    0xab: Instruction.XOR('E'),
    0xac: Instruction.XOR('H'),
    0xad: Instruction.XOR('L'),
    0xae: Instruction.XOR('(HL)'),
    0xaf: Instruction.XOR('A'),
    0xee: Instruction.XOR('d8'),

    0x17: Instruction.RLA,

    0x05: Instruction.DEC('B'),
    0x15: Instruction.DEC('D'),
    0x25: Instruction.DEC('H'),
    0x35: Instruction.DEC('(HL)'),
    0x0b: Instruction.DEC('BC'),
    0x1b: Instruction.DEC('DE'),
    0x2b: Instruction.DEC('HL'),
    0x3b: Instruction.DEC('SP'),
    0x0d: Instruction.DEC('C'),
    0x1d: Instruction.DEC('E'),
    0x2d: Instruction.DEC('L'),
    0x3d: Instruction.DEC('A'),

    0x80: Instruction.ADD('B'),
    0x81: Instruction.ADD('C'),
    0x82: Instruction.ADD('D'),
    0x83: Instruction.ADD('E'),
    0x84: Instruction.ADD('H'),
    0x85: Instruction.ADD('L'),
    0x86: Instruction.ADD('(HL)'),
    0x87: Instruction.ADD('A'),
    0xc6: Instruction.ADD('d8'),

    0x88: Instruction.ADDC('B'),
    0x89: Instruction.ADDC('C'),
    0x8a: Instruction.ADDC('D'),
    0x8b: Instruction.ADDC('E'),
    0x8c: Instruction.ADDC('H'),
    0x8d: Instruction.ADDC('L'),
    0x8e: Instruction.ADDC('(HL)'),
    0x8f: Instruction.ADDC('A'),
    0xce: Instruction.ADDC('d8'),

    0xa0: Instruction.AND('B'),
    0xa1: Instruction.AND('C'),
    0xa2: Instruction.AND('D'),
    0xa3: Instruction.AND('E'),
    0xa4: Instruction.AND('H'),
    0xa5: Instruction.AND('L'),
    0xa6: Instruction.AND('(HL)'),
    0xa7: Instruction.AND('A'),
    0xe6: Instruction.AND('d8'),

    0xb0: Instruction.OR('B'),
    0xb1: Instruction.OR('C'),
    0xb2: Instruction.OR('D'),
    0xb3: Instruction.OR('E'),
    0xb4: Instruction.OR('H'),
    0xb5: Instruction.OR('L'),
    0xb6: Instruction.OR('(HL)'),
    0xb7: Instruction.OR('A'),
    0xf6: Instruction.OR('d8'),

    0x90: Instruction.SUB('B'),
    0x91: Instruction.SUB('C'),
    0x92: Instruction.SUB('D'),
    0x93: Instruction.SUB('E'),
    0x94: Instruction.SUB('H'),
    0x95: Instruction.SUB('L'),
    0x96: Instruction.SUB('(HL)'),
    0x97: Instruction.SUB('A'),
    0xd6: Instruction.SUB('d8'),

    0x1f: Instruction.RRA,

    0xc3: Instruction.JP(true),
    0xc2: Instruction.JP('NZ'),
    0xd2: Instruction.JP('NC'),
    0xca: Instruction.JP('Z'),
    0xda: Instruction.JP('C'),

    0xe9: Instruction.JPIndirect,

    0x18: Instruction.JR(true),
    0x28: Instruction.JR('Z'),
    0x38: Instruction.JR('C'),
    0x20: Instruction.JR('NZ'),
    0x30: Instruction.JR('NC'),

    0xc4: Instruction.CALL('NZ'),
    0xd4: Instruction.CALL('NC'),
    0xcc: Instruction.CALL('Z'),
    0xdc: Instruction.CALL('C'),
    0xcd: Instruction.CALL(true),

    0xc0: Instruction.RET('NZ'),
    0xd0: Instruction.RET('NC'),
    0xc8: Instruction.RET('Z'),
    0xd8: Instruction.RET('C'),
    0xc9: Instruction.RET(true),

    0xf2: Instruction.LDAFromIndirect('(C)'),
    0x0a: Instruction.LDAFromIndirect('(BC)'),
    0x1a: Instruction.LDAFromIndirect('(DE)'),
    0x2a: Instruction.LDAFromIndirect('(HL+)'),
    0x3a: Instruction.LDAFromIndirect('(HL-)'),
    0xfa: Instruction.LDAFromIndirect('(a16)'),

    0xe2: Instruction.LDAToIndirect('(C)'),
    0x02: Instruction.LDAToIndirect('(BC)'),
    0x12: Instruction.LDAToIndirect('(DE)'),
    0x22: Instruction.LDAToIndirect('(HL+)'),
    0x32: Instruction.LDAToIndirect('(HL-)'),
    0xea: Instruction.LDAToIndirect('(a16)'),

    0x01: Instruction.LDWord('BC'),
    0x11: Instruction.LDWord('DE'),
    0x21: Instruction.LDWord('HL'),
    0x31: Instruction.LDWord('SP'),

    0x40: Instruction.LD('B', 'B'),
    0x41: Instruction.LD('B', 'C'),
    0x42: Instruction.LD('B', 'D'),
    0x43: Instruction.LD('B', 'E'),
    0x44: Instruction.LD('B', 'H'),
    0x45: Instruction.LD('B', 'L'),
    0x46: Instruction.LD('B', '(HL)'),
    0x47: Instruction.LD('B', 'A'),

    0x48: Instruction.LD('C', 'B'),
    0x49: Instruction.LD('C', 'C'),
    0x4a: Instruction.LD('C', 'D'),
    0x4b: Instruction.LD('C', 'E'),
    0x4c: Instruction.LD('C', 'H'),
    0x4d: Instruction.LD('C', 'L'),
    0x4e: Instruction.LD('C', '(HL)'),
    0x4f: Instruction.LD('C', 'A'),

    0x50: Instruction.LD('D', 'B'),
    0x51: Instruction.LD('D', 'C'),
    0x52: Instruction.LD('D', 'D'),
    0x53: Instruction.LD('D', 'E'),
    0x54: Instruction.LD('D', 'H'),
    0x55: Instruction.LD('D', 'L'),
    0x56: Instruction.LD('D', '(HL)'),
    0x57: Instruction.LD('D', 'A'),

    0x58: Instruction.LD('E', 'B'),
    0x59: Instruction.LD('E', 'C'),
    0x5a: Instruction.LD('E', 'D'),
    0x5b: Instruction.LD('E', 'E'),
    0x5c: Instruction.LD('E', 'H'),
    0x5d: Instruction.LD('E', 'L'),
    0x5e: Instruction.LD('E', '(HL)'),
    0x5f: Instruction.LD('E', 'A'),

    0x60: Instruction.LD('H', 'B'),
    0x61: Instruction.LD('H', 'C'),
    0x62: Instruction.LD('H', 'D'),
    0x63: Instruction.LD('H', 'E'),
    0x64: Instruction.LD('H', 'H'),
    0x65: Instruction.LD('H', 'L'),
    0x66: Instruction.LD('H', '(HL)'),
    0x67: Instruction.LD('H', 'A'),

    0x68: Instruction.LD('L', 'B'),
    0x69: Instruction.LD('L', 'C'),
    0x6a: Instruction.LD('L', 'D'),
    0x6b: Instruction.LD('L', 'E'),
    0x6c: Instruction.LD('L', 'H'),
    0x6d: Instruction.LD('L', 'L'),
    0x6e: Instruction.LD('L', '(HL)'),
    0x6f: Instruction.LD('L', 'A'),

    0x70: Instruction.LDToIndirect('B'),
    0x71: Instruction.LDToIndirect('C'),
    0x72: Instruction.LDToIndirect('D'),
    0x73: Instruction.LDToIndirect('E'),
    0x74: Instruction.LDToIndirect('H'),
    0x75: Instruction.LDToIndirect('L'),
    0x77: Instruction.LDToIndirect('A'),

    0x78: Instruction.LD('A', 'B'),
    0x79: Instruction.LD('A', 'C'),
    0x7a: Instruction.LD('A', 'D'),
    0x7b: Instruction.LD('A', 'E'),
    0x7c: Instruction.LD('A', 'H'),
    0x7d: Instruction.LD('A', 'L'),
    0x7e: Instruction.LD('A', '(HL)'),
    0x7f: Instruction.LD('A', 'A'),

    0x3e: Instruction.LD('A', 'd8'),
    0x06: Instruction.LD('B', 'd8'),
    0x0e: Instruction.LD('C', 'd8'),
    0x16: Instruction.LD('D', 'd8'),
    0x1e: Instruction.LD('E', 'd8'),
    0x26: Instruction.LD('H', 'd8'),
    0x2e: Instruction.LD('L', 'd8'),

    0xf8: Instruction.LDHLSPn,
    0xe0: Instruction.LDH_a8_A,
    0xf0: Instruction.LDHA_a8_,

    0xc5: Instruction.PUSH('BC'),
    0xd5: Instruction.PUSH('DE'),
    0xe5: Instruction.PUSH('HL'),
    0xf5: Instruction.PUSH('AF'),
    0xc1: Instruction.POP('BC'),
    0xd1: Instruction.POP('DE'),
    0xe1: Instruction.POP('HL'),
    0xf1: Instruction.POP('AF'),

    0xcb: Instruction.PREFIX,
    0x76: Instruction.Halt,
    0xf3: Instruction.DI,
    0x00: Instruction.NOP
}

const byteToPrefixInstructionMap: { [index: number]: Instruction | undefined } = {
    0x7c: Instruction.BIT7H,
    0x11: Instruction.RLC,

    0x38: Instruction.SRL('B'),
    0x39: Instruction.SRL('C'),
    0x3a: Instruction.SRL('D'),
    0x3b: Instruction.SRL('E'),
    0x3c: Instruction.SRL('H'),
    0x3d: Instruction.SRL('L'),
    0x3e: Instruction.SRL('(HL)'),
    0x3f: Instruction.SRL('A'),

    0x18: Instruction.RR('B'),
    0x19: Instruction.RR('C'),
    0x1a: Instruction.RR('D'),
    0x1b: Instruction.RR('E'),
    0x1c: Instruction.RR('H'),
    0x1d: Instruction.RR('L'),
    0x1e: Instruction.RR('(HL)'),
    0x1f: Instruction.RR('A'),

    0x30: Instruction.SWAP('B'),
    0x31: Instruction.SWAP('C'),
    0x32: Instruction.SWAP('D'),
    0x33: Instruction.SWAP('E'),
    0x34: Instruction.SWAP('H'),
    0x35: Instruction.SWAP('L'),
    0x36: Instruction.SWAP('(HL)'),
    0x37: Instruction.SWAP('A'),
}

export default Instruction