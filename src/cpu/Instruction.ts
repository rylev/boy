import { toHex } from 'lib/hex'
type AddHLBC = { type: 'ADD HL,BC' }
type JPa16 = { type: 'JP a16' }
type Halt = { type: 'HALT' }
type CPd8 = { type: 'CP d8' }
type JRzr8 = { type: 'JR Z,R8' }
type XORA = { type: 'XOR A' }

export type Instruction =
    | AddHLBC 
    | JPa16
    | Halt
    | CPd8
    | JRzr8
    | XORA

export namespace Instruction {
    export const AddHLBC: AddHLBC = { type: 'ADD HL,BC'}
    export const JPa16: JPa16 = { type: 'JP a16'}
    export const Halt: Halt = { type: 'HALT'}
    export const CPd8: CPd8 = { type: 'CP d8'}
    export const JRzr8: JRzr8 = { type: 'JR Z,R8'}
    export const XORA: XORA = { type: 'XOR A'}

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
    0xc3: Instruction.JPa16,
    0x76: Instruction.Halt,
    0xfe: Instruction.CPd8,
    0x28: Instruction.JRzr8,
    0xaf: Instruction.XORA
}

export default Instruction