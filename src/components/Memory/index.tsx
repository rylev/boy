import * as React from 'react'

import Bus from 'cpu/Bus'
import { toHex } from 'lib/hex'
import './memory.css'

type Props = { 
    bus: Bus, 
    pc: number, 
    offset: number, 
    changeOffset: (newOffset: number) => void,
    onByteClick: (addr: number) => void
}
type State = {}
class Memory extends React.Component<Props, State> {
    constructor (props: Props) {
        super(props)
    }

    render (): JSX.Element | null {
        const { bus } = this.props
        const options = { size: 8, count: 16, offset: this.props.offset }
        const rows = mapChunk(bus, options, (chunk, i) => this.row(chunk, options.size, i))
        const upButton = this.props.offset > 0 
            ? <button className="memoryMove memoryDown" onClick={this.moveDown}>▲</button>
            : null
        const downButton = this.props.offset < (8192 - options.count)
            ? <button className="memoryMove memoryUp" onClick={this.moveUp}>▼</button>
            : null
        return (
            <div className="memoryViewer">
               {upButton} 
                <div id="memory">
                    {rows}
                </div>
               {downButton} 
            </div>
        )
    }

    byte(address: number, value: number): JSX.Element {
        const { pc } = this.props
        const isPC = pc === address ? 'isPC' : ''
        return (
            <div className={`byte ${isPC}`} key={address} onClick={() => this.props.onByteClick(address)}>
                {toHex(value, 2)}
            </div>
        )
    }

    row(chunk: Uint8Array, numberOfBytes: number, index: number): JSX.Element {
        const offset = this.props.offset
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

    moveDown = () => {
        this.props.changeOffset(this.props.offset - 1)
    }

    moveUp = () => {
        this.props.changeOffset(this.props.offset + 1)
    }
}

type ChunkOptions = {size: number, count: number, offset: number}
function mapChunk<T>(bus: Bus, chunkOptions: ChunkOptions, callback: (slice: Uint8Array, index: number) => T): T[] {
    const result: T[] = []
    let index = 0
    while (index < chunkOptions.count) {
        const start = (chunkOptions.offset * chunkOptions.size) + (index * chunkOptions.size) 
        const end = start + chunkOptions.size 
        result.push(callback(bus.slice(start, end), index))
        index = index + 1
    } 

    return result
}

export default Memory