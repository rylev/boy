import { toHex } from 'lib/hex'

type AllRegistersButF = 'A' | 'B' | 'C' | 'D' | 'E' | 'H' | 'L'
type WordRegisters = 'BC' | 'DE' | 'HL'

type JumpTest = 'NZ' | 'NC' | 'Z' | 'C' | true
type JP = { type: 'JP', test: JumpTest }
type JR = { type: 'JR', test: JumpTest }
type CALLa16 = { type: 'CALL a16'}
type RET = { type: 'RET' }

type Halt = { type: 'HALT' }
type DI = { type: 'DI' }
type NOP = { type: 'NOP' }
type PREFIX = { type: 'PREFIX CB' }

type AddHLSource = 'BC' | 'DE' | 'HL' | 'SP'
type AddHL = { type: 'ADD HL', source: AddHLSource }
type XORA = { type: 'XOR A' }

type CPN = AllRegistersButF | '(HL)' | 'd8'
type CP = { type: 'CP', n: CPN }

type RLA = { type: 'RLA' }
type DECA = { type: 'DEC A' }
type DECB = { type: 'DEC B' }
type DECC = { type: 'DEC C' }
type DECD = { type: 'DEC D' }
type DECE = { type: 'DEC E' }

type INCTarget = AllRegistersButF | WordRegisters | '(HL)' | 'SP'
type INC = { type: 'INC', target: INCTarget }
type ADDA_HL_ = { type: 'ADD A,(HL)' }

type ANDN =  AllRegistersButF | '(HL)' | 'd8'
type AND = { type: 'AND', n: ANDN }

type SUBN = AllRegistersButF | '(HL)' | 'd8'
type SUB = { type: 'SUB', n: SUBN }

type LD_a16_A = { type: 'LD (a16),A' }
type LDHA_a8_ = { type: 'LDH A,(a8)' }
type LDH_a8_A = { type: 'LDH (a8),A' }

type LDAIndirectSource = '(BC)' | '(DE)' | '(HL-)' | '(HL+)' | '(a16)' | '(C)'
type LDAFromIndirect = { type: 'LD A From Indirect', source: LDAIndirectSource }

type LDSource = AllRegistersButF | '(HL)' | 'd8'
type LD = { type: 'LD', source: LDSource, target: AllRegistersButF }

type WordTarget = WordRegisters | 'SP'
type LDWord = { type: 'LD Word', target: WordTarget }

type LD_HLD_A = { type: 'LD (HL-),A' }
type LD_HLI_A = { type: 'LD (HL+),A' }
type LD_C_A = { type: 'LD (C),A' }
type LD_HL_A = { type: 'LD (HL),A' }

type PUSHSource = 'AF' | 'BC' | 'DE' | 'HL'
type PUSH = { type: 'PUSH', source: PUSHSource }
type POPTarget = PUSHSource
type POP = { type: 'POP', target: POPTarget }

type BIT7H = { type: 'BIT 7,H' }
type RLC = { type: 'RL C' }

type JumpInstruction = 
    | JP
    | JR
    | CALLa16
    | RET

type ControlInstruction = 
    | Halt
    | DI
    | NOP
    | PREFIX
    
type ArithmeticInstruction = 
    | AND
    | SUB
    | INC
    | AddHL
    | XORA
    | CP
    | RLA
    | DECA
    | DECB
    | DECC
    | DECD
    | DECE
    | ADDA_HL_

type LoadStoreInstruction = 
    | LD
    | LDWord
    | LDAFromIndirect
    | LD_a16_A
    | LDH_a8_A
    | LDHA_a8_
    | LD_HLD_A
    | LD_C_A
    | LD_HL_A
    | LD_HLI_A

type StackInstruction = 
    | PUSH
    | POP

type PrefixInstruction = 
    | BIT7H
    | RLC

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
    export const CALLa16: CALLa16 = { type: 'CALL a16' }
    export const RET: RET = { type: 'RET' }

    export const Halt: Halt = { type: 'HALT' }
    export const DI: DI = { type: 'DI' }
    export const NOP: NOP = { type: 'NOP' }
    export const PREFIX: PREFIX = { type: 'PREFIX CB' }

    export const AddHL = (source: AddHLSource): AddHL => ({ type: 'ADD HL', source })
    export const CP = (n: CPN): CP => ({ type: 'CP', n })
    export const XORA: XORA = { type: 'XOR A' }
    export const RLA: RLA = { type: 'RLA' }
    export const DECA: DECA = { type: 'DEC A' }
    export const DECB: DECB = { type: 'DEC B' }
    export const DECC: DECC = { type: 'DEC C' }
    export const DECD: DECD = { type: 'DEC D' }
    export const DECE: DECE = { type: 'DEC E' }
    export const INC = (target: INCTarget): INC => ({ type: 'INC', target })
    export const ADDA_HL_: ADDA_HL_ = { type: 'ADD A,(HL)' }
    export const AND = (n: ANDN): AND => ({ type: 'AND', n })
    export const SUB = (n: SUBN): SUB => ({ type: 'SUB', n })

    export const LD = (target: AllRegistersButF, source: LDSource): LD => ({ type: 'LD', target, source })
    export const LDWord = (target: WordTarget): LDWord => ({ type: 'LD Word', target })
    export const LDAFromIndirect = (source: LDAIndirectSource): LDAFromIndirect => ({ type: 'LD A From Indirect', source })
    export const LD_a16_A: LD_a16_A = { type: 'LD (a16),A' }
    export const LDH_a8_A: LDH_a8_A = { type: 'LDH (a8),A' }
    export const LD_HLD_A: LD_HLD_A = { type: 'LD (HL-),A' }
    export const LD_HLI_A: LD_HLI_A = { type: 'LD (HL+),A' }
    export const LD_C_A: LD_C_A = { type: 'LD (C),A' }
    export const LDHLA: LD_HL_A = { type: 'LD (HL),A' }
    export const LDHA_a8_: LDHA_a8_ = { type: 'LDH A,(a8)' }

    export const PUSH = (source: PUSHSource): PUSH => ({ type: 'PUSH', source })
    export const POP = (target: POPTarget): POP => ({ type: 'POP', target })

    export const BIT7H: BIT7H = { type: 'BIT 7,H' }
    export const RLC: RLC = { type: 'RL C' }

    export function fromByte(byte: number, prefix: boolean): Instruction {
        const instruction = prefix ? byteToPrefixInstructionMap[byte] : byteToInstructionMap[byte]
        if (instruction == undefined) { 
            const prefixDescription = prefix ? 'CB ' : ''
            throw new Error(`Unexpected OPCode: '${prefixDescription}${toHex(byte)}'`) 
        }
        return instruction
    }

    export function toByte(instruction: Instruction): number {
        const entries: [string, Instruction][] = Object.entries(byteToInstructionMap)
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

    0xaf: Instruction.XORA,
    0x17: Instruction.RLA,
    0x3d: Instruction.DECA,
    0x05: Instruction.DECB,
    0x0d: Instruction.DECC,
    0x1d: Instruction.DECE,
    0x86: Instruction.ADDA_HL_,

    0xa0: Instruction.AND('B'),
    0xa1: Instruction.AND('C'),
    0xa2: Instruction.AND('D'),
    0xa3: Instruction.AND('E'),
    0xa4: Instruction.AND('H'),
    0xa5: Instruction.AND('L'),
    0xa6: Instruction.AND('(HL)'),
    0xa7: Instruction.AND('A'),
    0xe6: Instruction.AND('d8'),

    0x90: Instruction.SUB('B'),
    0x91: Instruction.SUB('C'),
    0x92: Instruction.SUB('D'),
    0x93: Instruction.SUB('E'),
    0x94: Instruction.SUB('H'),
    0x95: Instruction.SUB('L'),
    0x96: Instruction.SUB('(HL)'),
    0x97: Instruction.SUB('A'),
    0xd6: Instruction.SUB('d8'),

    0x15: Instruction.DECD,

    0xc3: Instruction.JP(true),
    0xc2: Instruction.JP('NZ'),
    0xd2: Instruction.JP('NC'),
    0xca: Instruction.JP('Z'),
    0xda: Instruction.JP('C'),

    0x18: Instruction.JR(true),
    0x28: Instruction.JR('Z'),
    0x38: Instruction.JR('C'),
    0x20: Instruction.JR('NZ'),
    0x30: Instruction.JR('NC'),

    0xcd: Instruction.CALLa16,
    0xc9: Instruction.RET,

    0xea: Instruction.LD_a16_A,

    0xf2: Instruction.LDAFromIndirect('(C)'),
    0x0a: Instruction.LDAFromIndirect('(BC)'),
    0x1a: Instruction.LDAFromIndirect('(DE)'),
    0x2a: Instruction.LDAFromIndirect('(HL+)'),
    0x3a: Instruction.LDAFromIndirect('(HL-)'),
    0xfa: Instruction.LDAFromIndirect('(a16)'),

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

    0xe0: Instruction.LDH_a8_A,
    0x32: Instruction.LD_HLD_A,
    0x22: Instruction.LD_HLI_A,
    0xe2: Instruction.LD_C_A,
    0x77: Instruction.LDHLA,
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
    0x11: Instruction.RLC
}

export default Instruction