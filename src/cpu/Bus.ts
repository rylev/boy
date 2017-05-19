import { toHex } from 'lib/hex'

class Bus {
    private _biosMapped: boolean
    private _bios: Uint8Array
    private _rom: Uint8Array
    private _graphicsRam: Uint8Array

    constructor(bios: Uint8Array | undefined, rom: Uint8Array) {
        if (bios) {
            this._bios = bios
            this._biosMapped = true
        }
        this._rom = rom
        this._graphicsRam = new Uint8Array(0x9FFF - 0x8000)
    }

    get biosMapped(): boolean {
        return this._biosMapped
    }

    get bios(): Uint8Array {
        return this._bios
    }

    get rom(): Uint8Array {
        return this._rom
    }

    slice(start: number, end: number): Uint8Array {
        let array = new Uint8Array(end - start)
        let index = 0
        while (index <= end - start - 1) {
            array[index] = this.read(start + index)
            index = index + 1
        }

        return array
    }

    read(addr: number): number {
        let value: number | undefined
        if (addr < 0x100 && this._biosMapped) {
            value = this._bios[addr]
        } else if (addr < 0x8000) {
            value = this._rom[addr]
        } 
        if (value === undefined) { throw new Error(`No value at address 0x${toHex(addr)}`)}
        return value
    }

    write(addr: number, value: number) {
        if (addr < 0x100 && this._biosMapped) {
            throw new Error("Cannot write to bios")
        } else if (addr < 0x8000) {
            this._rom[addr] = value
        } else if (addr >= 0x8000 && addr < 0xA000) {
            this._graphicsRam[addr - 0x8000] = value
        } else if (addr >= 0xff00 && addr <= 0xff7f) {
            console.warn(`Writting '0x${toHex(value)}' to memory mapped IO which is not implemented`)
        } else if (addr >= 0xff80 && addr <= 0xffff) {
            console.warn(`Writting '0x${toHex(value)}' to zero paged ram which is not implemented`)
        } else {
            throw new Error(`Unrecognized address 0x${toHex(addr)}`)
        }
    }

    unmapBios() {
        this._biosMapped = false
    }
}

export default Bus