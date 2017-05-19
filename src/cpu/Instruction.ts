import { toHex } from 'lib/hex'

type JPa16 = { type: 'JP a16' }
type JRzr8 = { type: 'JR Z,R8' }
type JRr8 = { type: 'JR R8' }
type CALLa16 = { type: 'CALL a16'}

type Halt = { type: 'HALT' }
type DI = { type: 'DI' }
type NOP = { type: 'NOP' }

type AddHLBC = { type: 'ADD HL,BC' }
type XORA = { type: 'XOR A' }
type CPd8 = { type: 'CP d8' }

type LDAd8 = { type: 'LD A,d8' }
type LDa16A = { type: 'LD (a16),A' }
type LDHa8A = { type: 'LDH (a8),A' }
type LDSPd16 = { type: 'LD SP,d16' }

type JumpInstruction = 
    | JPa16
    | JRzr8
    | JRr8
    | CALLa16

type ControlInstruction = 
    | Halt
    | DI
    | NOP
    
type ArithmeticInstruction = 
    | AddHLBC 
    | XORA
    | CPd8

type LoadStoreInstruction = 
    | LDAd8
    | LDa16A
    | LDHa8A
    | LDSPd16

export type Instruction =
    | JumpInstruction
    | ControlInstruction
    | ArithmeticInstruction
    | LoadStoreInstruction


export namespace Instruction {
    export const JRzr8: JRzr8 = { type: 'JR Z,R8' }
    export const JRr8: JRr8 = { type: 'JR R8' }
    export const JPa16: JPa16 = { type: 'JP a16' }
    export const CALLa16: CALLa16 = { type: 'CALL a16' }

    export const Halt: Halt = { type: 'HALT' }
    export const DI: DI = { type: 'DI' }
    export const NOP: NOP = { type: 'NOP' }

    export const AddHLBC: AddHLBC = { type: 'ADD HL,BC' }
    export const CPd8: CPd8 = { type: 'CP d8' }
    export const XORA: XORA = { type: 'XOR A' }

    export const LDAd8: LDAd8 = { type: 'LD A,d8' }
    export const LDa16A: LDa16A = { type: 'LD (a16),A' }
    export const LDHa8A: LDHa8A = { type: 'LDH (a8),A' }
    export const LDSPd16: LDSPd16 = { type: 'LD SP,d16' }

    export function fromByte(byte: number): Instruction {
        const instruction = byteToInstructionMap[byte]
        if (instruction == undefined) { throw new Error(`Unexpected OPCode: '${toHex(byte)}'`) }
        return instruction
    }

    export function toByte(instruction: Instruction): number {
        const entries: [string, Instruction][] = Object.entries(byteToInstructionMap)
        const entry = entries.find(pair => {
            const [key, value] = pair
            return value == instruction
        })
        if (entry == undefined) { throw new Error(`Unexpected instruction: '${instruction.type}'`) }
        return parseInt(entry[0])
    }
}

const byteToInstructionMap: {[index: number]: Instruction | undefined} = {
    0x09: Instruction.AddHLBC,
    0xfe: Instruction.CPd8,
    0xaf: Instruction.XORA,

    0xc3: Instruction.JPa16,
    0x28: Instruction.JRzr8,
    0x18: Instruction.JRr8,
    0xcd: Instruction.CALLa16,

    0x3e: Instruction.LDAd8,
    0xea: Instruction.LDa16A,
    0x31: Instruction.LDSPd16,
    0xe0: Instruction.LDHa8A,

    0x76: Instruction.Halt,
    0xf3: Instruction.DI,
    0x00: Instruction.NOP
}

export default Instruction