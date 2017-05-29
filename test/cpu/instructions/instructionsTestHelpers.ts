import CPU from 'cpu'

export function createRom(bytes: number[]): Uint8Array {
    const pad: number[] = Array(CPU.START_ADDR).fill(0)
    const rom = pad.concat(bytes)
    return Uint8Array.from(rom)
}