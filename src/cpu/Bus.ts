import { toHex } from 'lib/hex'
import GPU from './GPU'

class Bus {
    private _biosMapped: boolean
    private _bios: Uint8Array
    private _rom: Uint8Array
    private _gpu: GPU
    private _memoryMappedIO: Uint8Array
    private _zeroPagedRam: Uint8Array
    private _workingRam: Uint8Array

    constructor(bios: Uint8Array | undefined, rom: Uint8Array, gpu: GPU) {
        if (bios) {
            this._bios = bios
            this._biosMapped = true
        }
        this._rom = rom
        this._gpu = gpu
        this._memoryMappedIO = new Uint8Array(0xff7f - 0xff00)
        this._zeroPagedRam = new Uint8Array(0xffff - 0xff7f)
        this._workingRam = new Uint8Array(0xbfff - 0x9fff)
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
        }  else if (addr >= GPU.VRAM_BEGIN && addr <= GPU.VRAM_END) {
            value = this._gpu.vram[addr - GPU.VRAM_BEGIN]
        }  else if (addr >= 0xA000 && addr <= 0xbfff) {
            value = undefined // TODO: define
        }  else if (addr >= 0xff00 && addr <= 0xff7f) {
            // TODO: value = this._memoryMappedIO[addr - 0xff00]
            // Hard code vertical blank for now
            value = 0x90
        }  else if (addr >= 0xff80 && addr <= 0xffff) {
            value = this._zeroPagedRam[addr - 0xff80]
        }
        if (value === undefined) { throw new Error(`No value at address 0x${toHex(addr)}`)}
        return value
    }

    write(addr: number, value: number) {
        if (addr < 0x100 && this._biosMapped) {
            throw new Error("Cannot write to bios")
        } else if (addr < 0x8000) {
            this._rom[addr] = value
        } else if (addr >= GPU.VRAM_BEGIN && addr <= GPU.VRAM_END) {
            this._gpu.vram[addr - GPU.VRAM_BEGIN] = value
        } else if (addr >= 0xff00 && addr <= 0xff7f) {
            this._memoryMappedIO[addr - 0xff00] = value
        } else if (addr >= 0xff80 && addr <= 0xffff) {
            this._zeroPagedRam[addr - 0xff80] = value
        } else {
            throw new Error(`Unrecognized address 0x${toHex(addr)}`)
        }
    }

    unmapBios() {
        this._biosMapped = false
    }
}

export default Bus