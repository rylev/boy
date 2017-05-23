import { toHex } from 'lib/hex'
import GPU, { Color, WindowTileMap, BackgroundTileMap, BackgroundAndWindowTileMap, ObjectSize } from './GPU'

class Bus {
    private _biosMapped: boolean
    private _bios: Uint8Array
    private _rom: Uint8Array
    private _gpu: GPU
    private _zeroPagedRam: Uint8Array
    private _workingRam: Uint8Array

    constructor(bios: Uint8Array | undefined, rom: Uint8Array, gpu: GPU) {
        if (bios) {
            this._bios = bios
            this._biosMapped = true
        }
        this._rom = rom
        this._gpu = gpu
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
            value = this.readIO(addr)
        }  else if (addr >= 0xff80 && addr <= 0xffff) {
            value = this._zeroPagedRam[addr - 0xff80]
        }
        if (value === undefined) { throw new Error(`No value at address 0x${toHex(addr)}`)}
        return value
    }

    write(addr: number, value: number) {
        if (value > 0xFF) { throw Error(`Value ${value.toString(16)} to address ${addr.toString(16)} is to too big`)}
        if (addr < 0x100 && this._biosMapped) {
            throw new Error("Cannot write to bios")
        } else if (addr < 0x8000) {
            this._rom[addr] = value
        } else if (addr >= GPU.VRAM_BEGIN && addr <= GPU.VRAM_END) {
            this._gpu.writeVram(addr - GPU.VRAM_BEGIN, value)
        } else if (addr >= 0xff00 && addr <= 0xff7f) {
            this.writeIO(addr, value)
        } else if (addr >= 0xff80 && addr <= 0xffff) {
            this._zeroPagedRam[addr - 0xff80] = value
        } else {
            throw new Error(`Unrecognized address 0x${toHex(addr)}`)
        }
    }

    readIO(addr: number): number {
        switch (addr) {
            case 0xff44: 
                return this._gpu.line
            case 0xff42:
                return this._gpu.scrollY
            default:
                throw new Error(`Reading unrecognized IO address 0x${toHex(addr)}`)

        }
    }

    writeIO(addr: number, value: number) {
        switch (addr) {
            case 0xff11:
                // http://bgb.bircd.org/pandocs.htm#soundoverview
                // TODO: Channel 1 Sound length/Wave pattern
            case 0xff12:
                // TODO: Channel 1 Volume Envelope
            case 0xff13:
                // Channel 1 Frequency lo
            case 0xff14:
                // Channel 1 Frequency hi
            case 0xff24:
                // TODO: Channel control / ON-OFF / Volume
            case 0xff25:
                // TODO: Selection of Sound output terminal
            case 0xff26:
                // TODO: Sound on/off
                console.warn(`Writing to sound register is ignored: 0x${toHex(addr)}`)
                return
            case 0xff40: 
                this._gpu.lcdDisplayEnabled = (value >> 7) === 1
                this._gpu.windowTileMap = ((value >> 6) & 0b1) === 0 ? WindowTileMap.x9800 : WindowTileMap.x9c00
                this._gpu.windowDisplayEnabled = ((value >> 5) & 0b1) === 1 
                this._gpu.backgroundAndWindowTileMap = ((value >> 4) & 0b1) === 0 
                    ? BackgroundAndWindowTileMap.x8800 
                    : BackgroundAndWindowTileMap.x8000
                this._gpu.backgroundTileMap = ((value >> 3) & 0b1) === 0 ? BackgroundTileMap.x9800 : BackgroundTileMap.x9c00
                this._gpu.objectSize = ((value >> 2) & 0b1) === 0 ? ObjectSize.os8x8 : ObjectSize.os16x16
                this._gpu.objectDisplayEnable = ((value >> 1) & 0b1) === 1 
                this._gpu.backgroundDisplayEnabled = (value & 0b1) === 1 
                return
            case 0xff42:
                this._gpu.scrollY = value
                return
            case 0xff47:
                function bitsToColor(bits: number): Color {
                    switch (bits) {
                        case 0: return Color.White
                        case 1: return Color.LightGray
                        case 2: return Color.DarkGray
                        case 3: return Color.Black
                        default: throw new Error("Should not be possible")
                    }
                }
                this._gpu.color3 = bitsToColor(value >> 6)
                this._gpu.color2 = bitsToColor((value >> 4) & 0b11)
                this._gpu.color1 = bitsToColor((value >> 2) & 0b11)
                this._gpu.color0 = bitsToColor(value & 0b11)
                return
            case 0xff50:
                console.warn(`Writing to 0x${toHex(addr)}. TODO: unmap bootrom`)
                return
            default:
                throw new Error(`Writting to unrecognized IO address 0x${toHex(addr)}`)
        }
    }

    unmapBios() {
        this._biosMapped = false
    }
}

export default Bus