import * as React from 'react'

import Bus from 'cpu/Bus'
import './memory.css'

type Props = {bus: Bus, pc: number}
class Memory extends React.Component<Props, {}> {
    rom (bus: Bus, pc: number): JSX.Element | null {
        const options = { size: 8, count: 18, offset: (pc / 8)}
        const divs = mapChunk(bus.rom, options, (chunk, i) => {
            const beginning = (options.offset * options.size) + (i * options.size)
            return (
                <div key={i}>
                    <span>0x{toHex(beginning, 3)}: </span>
                    {Array.from(chunk).map((b,i) => {
                        const isPC = (pc === (beginning + i)) ? 'isPC' : ''
                        return <span className={`byte ${isPC}`} key={i}>{toHex(b, 2)}</span>
                    })}
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
        const { bus, pc } = this.props
        if (bus.biosMapped) {
            return (
                <div>
                    <p>BIOS</p>
                </div>
            )
        } else {
            return this.rom(bus, pc)
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
    let index = 0
    while (index < chunkOptions.count) {
        const start = (chunkOptions.offset * chunkOptions.size) + (index * chunkOptions.size) 
        const end = start + chunkOptions.size - 1
        result.push(callback(array.slice(start, end), index))
        index = index + 1
    } 

    return result
}

export default Memory