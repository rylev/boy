import { toHex } from 'lib/hex'

type JPa16 = { type: 'JP a16' }
type JRzr8 = { type: 'JR Z,R8' }
type JRr8 = { type: 'JR R8' }

type Halt = { type: 'HALT' }

type AddHLBC = { type: 'ADD HL,BC' }
type XORA = { type: 'XOR A' }
type CPd8 = { type: 'CP d8' }

type JumpInstruction = 
    | JPa16
    | JRzr8
    | JRr8

type ControlInstruction = 
    | Halt
    
type ArithmeticInstruction = 
    | AddHLBC 
    | XORA
    | CPd8

export type Instruction =
    | JumpInstruction
    | ControlInstruction
    | ArithmeticInstruction

export namespace Instruction {
    export const JRzr8: JRzr8 = { type: 'JR Z,R8'}
    export const JRr8: JRr8 = { type: 'JR R8'}
    export const JPa16: JPa16 = { type: 'JP a16'}

    export const Halt: Halt = { type: 'HALT'}

    export const AddHLBC: AddHLBC = { type: 'ADD HL,BC'}
    export const CPd8: CPd8 = { type: 'CP d8'}
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
    0xaf: Instruction.XORA,
    0x18: Instruction.JRr8

}

export default Instruction