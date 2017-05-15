import * as React from 'react'

import Bus from 'cpu/Bus'
import './memory.css'

type Props = {bus: Bus}
class Memory extends React.Component<Props, {}> {
    rom (bus: Bus): JSX.Element | null {
        const options = { size: 8, count: 100, offset: 0}
        const divs = mapChunk(bus.rom, options, (chunk, i) => {
            return (
                <div key={i}>
                    <span>{toHex(options.offset + (options.size * i), 3)}x: </span>
                    {Array.from(chunk).map((b,i) => <span className="byte" key={i}>{toHex(b, 2)}</span>)}
                </div>
            )
        })
        return (
            <div>
                <p>ROM</p>
                {divs}
            </div>
        )
    }

    render (): JSX.Element | null {
        const { bus } = this.props
        if (bus.biosMapped) {
            return (
                <div>
                    <p>BIOS</p>
                </div>
            )
        } else {
            return this.rom(bus)
        }
    }
}

function toHex(byte: number, places: number): string {
    const hex = byte.toString(16)
    const padding = places - hex.length 
    return `${"0".repeat(padding > 0 ? padding : 0)}${hex}`
}

type ChunkOptions = {size: number, count: number, offset: number}
function mapChunk<T>(array: Uint8Array, chunkOptions: ChunkOptions, callback: (slice: Uint8Array, index: number) => T): T[] {
    const result: T[] = []
    const offset = chunkOptions.offset * chunkOptions.size
    let index = 0
    while (index < chunkOptions.count) {
        const start = (offset * chunkOptions.size) + (index * chunkOptions.size) 
        const end = start + chunkOptions.size - 1
        result.push(callback(array.slice(start, end), index))
        index = index + 1
    } 

    return result
}

export default Memory