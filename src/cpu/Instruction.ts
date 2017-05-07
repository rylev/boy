function AddHLBC(): AddHLBC { return { type: 'ADD HL,BC'}}
type AddHLBC = { type: 'ADD HL,BC' }

function JPa16(): JPa16 { return { type: 'JP a16'}}
type JPa16 = { type: 'JP a16' }

export type Instruction =
    | AddHLBC 
    | JPa16

export namespace Instruction {
    function fromByte(byte: number) {
        switch (byte) {
            case 0x09: return AddHLBC()
            case 0xc3: return JPa16()
            default: 
                throw `Unexpected OPCode ${byte}`
        }
    }
}

export default Instruction