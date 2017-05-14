type AddHLBC = { type: 'ADD HL,BC' }
type JPa16 = { type: 'JP a16' }
type Halt = { type: 'HALT' }

export type Instruction =
    | AddHLBC 
    | JPa16
    | Halt

export namespace Instruction {
    export const AddHLBC: AddHLBC = { type: 'ADD HL,BC'}
    export const JPa16: JPa16 = { type: 'JP a16'}
    export const Halt: Halt = { type: 'HALT'}

    export function fromByte(byte: number): Instruction {
        const instruction = byteToInstructionMap[byte]
        if (instruction == undefined) { throw new Error(`Unexpected OPCode: '${byte}'`) }
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
    0x67: Instruction.Halt
}

export default Instruction