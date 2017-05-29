import { toHex } from 'lib/hex'

type AllRegistersButF = 'A' | 'B' | 'C' | 'D' | 'E' | 'H' | 'L'
type JumpTest = 'NZ' | 'NC' | 'Z' | 'C' | true
type JP = { type: 'JP', test: JumpTest }
type JR = { type: 'JR', test: JumpTest }
type CALLa16 = { type: 'CALL a16'}
type RET = { type: 'RET' }

type Halt = { type: 'HALT' }
type DI = { type: 'DI' }
type NOP = { type: 'NOP' }
type PREFIX = { type: 'PREFIX CB' }

type AddHLBC = { type: 'ADD HL,BC' }
type XORA = { type: 'XOR A' }

type CPN = AllRegistersButF | '(HL)' | 'd8'
type CP = { type: 'CP', n: CPN }

type RLA = { type: 'RLA' }
type DECA = { type: 'DEC A' }
type DECB = { type: 'DEC B' }
type DECC = { type: 'DEC C' }
type DECD = { type: 'DEC D' }
type DECE = { type: 'DEC E' }
type INCHL = { type: 'INC HL' }
type INCDE = { type: 'INC DE' }
type INCB = { type: 'INC B' }
type INCC = { type: 'INC C' }
type INCH = { type: 'INC H' }
type ADDA_HL_ = { type: 'ADD A,(HL)' }

type SUBN = AllRegistersButF | '(HL)' | 'd8'
type SUB = { type: 'SUB', n: SUBN }

type LDAd8 = { type: 'LD A,d8' }
type LDBd8 = { type: 'LD B,d8' }
type LDCd8 = { type: 'LD C,d8' }
type LDDd8 = { type: 'LD D,d8' }
type LDEd8 = { type: 'LD E,d8' }
type LDLd8 = { type: 'LD L,d8' }
type LD_a16_A = { type: 'LD (a16),A' }
type LDHA_a8_ = { type: 'LDH A,(a8)' }
type LDH_a8_A = { type: 'LDH (a8),A' }

type WordRegisters = 'BC' | 'DE' | 'HL'
type WordTarget = WordRegisters | 'SP'
type LDWord = { type: 'LD Word', target: WordTarget }

type LD_HLD_A = { type: 'LD (HL-),A' }
type LD_HLI_A = { type: 'LD (HL+),A' }
type LD_C_A = { type: 'LD (C),A' }
type LD_HL_A = { type: 'LD (HL),A' }
type LDA_DE_ = { type: 'LD A,(DE)' }
type LDCA = { type: 'LD C,A' }
type LDHA = { type: 'LD H,A' }
type LDDA = { type: 'LD D,A' }
type LDAE = { type: 'LD A,E' }
type LDAL = { type: 'LD A,L' }
type LDAB = { type: 'LD A,B' }
type LDAH = { type: 'LD A,H' }

type PUSHBC = { type: 'PUSH BC' }
type POPBC = { type: 'POP BC' }

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
    | AddHLBC 
    | XORA
    | CP
    | RLA
    | DECA
    | DECB
    | DECC
    | DECD
    | DECE
    | INCB
    | INCC
    | INCH
    | INCHL
    | INCDE
    | LDAE
    | LDAH
    | ADDA_HL_
    | SUB

type LoadStoreInstruction = 
    | LDAd8
    | LDLd8
    | LDDd8
    | LDEd8
    | LD_a16_A
    | LDH_a8_A
    | LDHA_a8_
    | LDWord
    | LD_HLD_A
    | LDCd8
    | LD_C_A
    | LD_HL_A
    | LDA_DE_
    | LDCA
    | LDBd8
    | LDHA
    | LDDA
    | LDAB
    | LD_HLI_A
    | LDAL

type StackInstruction = 
    | PUSHBC
    | POPBC

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

    export const AddHLBC: AddHLBC = { type: 'ADD HL,BC' }
    export const CP = (n: CPN): CP => ({ type: 'CP', n })
    export const XORA: XORA = { type: 'XOR A' }
    export const RLA: RLA = { type: 'RLA' }
    export const DECA: DECA = { type: 'DEC A' }
    export const DECB: DECB = { type: 'DEC B' }
    export const DECC: DECC = { type: 'DEC C' }
    export const DECD: DECD = { type: 'DEC D' }
    export const DECE: DECE = { type: 'DEC E' }
    export const INCB: INCB = { type: 'INC B' }
    export const INCC: INCC = { type: 'INC C' }
    export const INCH: INCH = { type: 'INC H' }
    export const INCHL: INCHL = { type: 'INC HL' }
    export const INCDE: INCDE = { type: 'INC DE' }
    export const ADDA_HL_: ADDA_HL_ = { type: 'ADD A,(HL)' }
    export const SUB = (n: SUBN): SUB => ({ type: 'SUB', n })

    export const LDAd8: LDAd8 = { type: 'LD A,d8' }
    export const LDDd8: LDDd8 = { type: 'LD D,d8' }
    export const LDEd8: LDEd8 = { type: 'LD E,d8' }
    export const LDLd8: LDLd8 = { type: 'LD L,d8' }
    export const LD_a16_A: LD_a16_A = { type: 'LD (a16),A' }
    export const LDH_a8_A: LDH_a8_A = { type: 'LDH (a8),A' }
    export const LDWord = (target: WordTarget): LDWord => ({ type: 'LD Word', target })
    export const LD_HLD_A: LD_HLD_A = { type: 'LD (HL-),A' }
    export const LD_HLI_A: LD_HLI_A = { type: 'LD (HL+),A' }
    export const LDCd8: LDCd8 = { type: 'LD C,d8' }
    export const LD_C_A: LD_C_A = { type: 'LD (C),A' }
    export const LDCA: LDCA = { type: 'LD C,A' }
    export const LDHLA: LD_HL_A = { type: 'LD (HL),A' }
    export const LDA_DE_: LDA_DE_ = { type: 'LD A,(DE)' }
    export const LDBd8: LDBd8 = { type: 'LD B,d8' }
    export const LDAB: LDAB = { type: 'LD A,B' }
    export const LDAE: LDAE = { type: 'LD A,E' }
    export const LDAH: LDAH = { type: 'LD A,H' }
    export const LDDA: LDDA = { type: 'LD D,A' }
    export const LDHA: LDHA = { type: 'LD H,A' }
    export const LDHA_a8_: LDHA_a8_ = { type: 'LDH A,(a8)' }
    export const LDAL: LDAL = { type: 'LD A,L' }

    export const PUSHBC: PUSHBC = { type: 'PUSH BC' }
    export const POPBC: POPBC = { type: 'POP BC' }

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
            for (let v of Object.values(value)) {
                answer = Object.values(instruction).includes(v)
                if (!answer) return answer
            }
            return answer
        })
        if (entry == undefined) { throw new Error(`Unexpected instruction: '${instruction.type}'`) }
        return parseInt(entry[0])
    }
}

const byteToInstructionMap: {[index: number]: Instruction | undefined} = {
    0x09: Instruction.AddHLBC,
    0xb8: Instruction.CP('B'),
    0xb9: Instruction.CP('C'),
    0xba: Instruction.CP('D'),
    0xbb: Instruction.CP('E'),
    0xbc: Instruction.CP('H'),
    0xbd: Instruction.CP('L'),
    0xbe: Instruction.CP('(HL)'),
    0xbf: Instruction.CP('A'),
    0xfe: Instruction.CP('d8'),
    0xaf: Instruction.XORA,
    0x17: Instruction.RLA,
    0x3d: Instruction.DECA,
    0x04: Instruction.INCB,
    0x0c: Instruction.INCC,
    0x24: Instruction.INCH,
    0x05: Instruction.DECB,
    0x0d: Instruction.DECC,
    0x1d: Instruction.DECE,
    0x23: Instruction.INCHL,
    0x13: Instruction.INCDE,
    0x86: Instruction.ADDA_HL_,
    0x97: Instruction.SUB('A'),
    0x90: Instruction.SUB('B'),
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

    0x3e: Instruction.LDAd8,
    0x16: Instruction.LDDd8,
    0x2e: Instruction.LDLd8,
    0xea: Instruction.LD_a16_A,
    0x01: Instruction.LDWord('BC'),
    0x11: Instruction.LDWord('DE'),
    0x21: Instruction.LDWord('HL'),
    0x31: Instruction.LDWord('SP'),
    0xe0: Instruction.LDH_a8_A,
    0x32: Instruction.LD_HLD_A,
    0x22: Instruction.LD_HLI_A,
    0x0e: Instruction.LDCd8,
    0xe2: Instruction.LD_C_A,
    0x77: Instruction.LDHLA,
    0x1a: Instruction.LDA_DE_,
    0x4f: Instruction.LDCA,
    0x06: Instruction.LDBd8,
    0x1e: Instruction.LDEd8,
    0x7b: Instruction.LDAE,
    0x67: Instruction.LDHA,
    0x57: Instruction.LDDA,
    0xf0: Instruction.LDHA_a8_,
    0x7c: Instruction.LDAH,
    0x7d: Instruction.LDAL,
    0x78: Instruction.LDAB,

    0xc5: Instruction.PUSHBC,
    0xc1: Instruction.POPBC,

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