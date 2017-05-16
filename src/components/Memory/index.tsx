import * as React from 'react'

import Bus from 'cpu/Bus'
import './memory.css'

const BYTE_SIZE = 8
type Props = {bus: Bus, pc: number}
type State = { offset: number }
class Memory extends React.Component<Props, State> {
    constructor (props: Props) {
        super(props)
        this.state = {offset: (this.props.pc / BYTE_SIZE) }
    }

    byte(address: number, value: number): JSX.Element {
        const { pc } = this.props
        const isPC = pc === address ? 'isPC' : ''
        return <div className={`byte ${isPC}`} key={address}>{toHex(value, 2)}</div>
    }

    row(chunk: Uint8Array, numberOfBytes: number, index: number): JSX.Element {
        const offset = this.state.offset
        const firstByteAddress = (offset * numberOfBytes) + (index * numberOfBytes)
        const isHeader = firstByteAddress >= 0x0100 && firstByteAddress < 0x014F ? 'isHeader' : ''
        const bytes = Array.from(chunk).map((byte, i) => this.byte(firstByteAddress + i, byte))
        return (
            <div className={`memoryRow ${isHeader}`} key={index}>
                <div className="rowAddress">0x{toHex(firstByteAddress, 3)}: </div>
                <div className="bytes">{bytes}</div>
            </div>
        )
    }

    render (): JSX.Element | null {
        const { bus } = this.props
        const options = { size: 8, count: 18, offset: this.state.offset }
        const rows = mapChunk(bus, options, (chunk, i) => this.row(chunk, options.size, i))
        return (
            <div id="memory">
                {rows}
            </div>
        )
    }
}

function toHex(byte: number, places: number): string {
    const hex = byte.toString(16)
    const padding = places - hex.length 
    return `${"0".repeat(padding > 0 ? padding : 0)}${hex}`
}

type ChunkOptions = {size: number, count: number, offset: number}
function mapChunk<T>(bus: Bus, chunkOptions: ChunkOptions, callback: (slice: Uint8Array, index: number) => T): T[] {
    const result: T[] = []
    let index = 0
    while (index < chunkOptions.count) {
        const start = (chunkOptions.offset * chunkOptions.size) + (index * chunkOptions.size) 
        const end = start + chunkOptions.size - 1
        result.push(callback(bus.slice(start, end), index))
        index = index + 1
    } 

    return result
}

export default Memory