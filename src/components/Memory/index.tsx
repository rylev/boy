import * as React from 'react'

import Bus from 'cpu/Bus'
import { toHex } from 'lib/hex'
import './memory.css'

type Props = { 
    bus: Bus, 
    pc: number, 
    sp: number,
    offset: number, 
    changeOffset: (newOffset: number) => void,
    onByteClick: (addr: number) => void
}
type State = {}
const ROW_COUNT = 16
const OFFSET_COUNT = 8192
const MAX_OFFSET = OFFSET_COUNT - ROW_COUNT

class Memory extends React.Component<Props, State> {
    constructor (props: Props) {
        super(props)
    }

    render (): JSX.Element | null {
        const { bus, offset } = this.props
        const normalizedOffset = this.normalizedOffset()
        const options = { size: 8, count: ROW_COUNT, offset: normalizedOffset }
        const rows = mapChunk(bus, options, (chunk, i) => this.row(chunk, options.size, i))
        const moveUpButtonDiabled = normalizedOffset >= MAX_OFFSET
        const moveDownButtonDisabled = normalizedOffset <= 0 
        return (
            <div className="memoryViewer">
                <div className="memoryMove memoryDown" disabled={moveDownButtonDisabled} onClick={this.moveDown}>▲</div>
                <div id="memory">
                    {rows}
                </div>
                <div className="memoryMove memoryUp" disabled={moveUpButtonDiabled} onClick={this.moveUp}>▼</div>
            </div>
        )
    }

    byte(address: number, value: number): JSX.Element {
        const { pc, sp } = this.props
        const isPC = pc === address ? 'isPC' : ''
        const isSP = sp === address ? 'isSP' : ''
        return (
            <div className={`byte ${isPC} ${isSP}`} key={address} onClick={() => this.props.onByteClick(address)}>
                {toHex(value, 2)}
            </div>
        )
    }

    row(chunk: Uint8Array, numberOfBytes: number, index: number): JSX.Element {
        const firstByteAddress = (this.normalizedOffset() * numberOfBytes) + (index * numberOfBytes)
        const isHeader = firstByteAddress >= 0x0100 && firstByteAddress < 0x014F ? 'isHeader' : ''
        const bytes = Array.from(chunk).map((byte, i) => this.byte(firstByteAddress + i, byte))
        return (
            <div className={`memoryRow ${isHeader}`} key={index}>
                <div className="rowAddress">0x{toHex(firstByteAddress, 3)}: </div>
                <div className="bytes">{bytes}</div>
            </div>
        )
    }

    normalizedOffset() {
        return Math.max(0, Math.min(this.props.offset, MAX_OFFSET))
    }

    moveDown = () => {
        this.props.changeOffset(this.normalizedOffset() - 1)
    }

    moveUp = () => {
        this.props.changeOffset(this.normalizedOffset() + 1)
    }
}

type ChunkOptions = {size: number, count: number, offset: number}
function mapChunk<T>(bus: Bus, chunkOptions: ChunkOptions, callback: (slice: Uint8Array, index: number) => T): T[] {
    const maxStart = (MAX_OFFSET * chunkOptions.size) + (chunkOptions.count * chunkOptions.size) 
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