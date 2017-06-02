import { toHex } from 'lib/hex'
import GPU, { Color, WindowTileMap, BackgroundTileMap, BackgroundAndWindowDataSelect, ObjectSize, GPUMode } from './GPU'
import Joypad, { Column } from './Joypad'

class Bus {
    private _biosMapped: boolean
    private _bios: Uint8Array
    private _rom: Uint8Array
    private _gpu: GPU
    private _joypad: Joypad
    private _zeroPagedRam: Uint8Array
    private _workingRam: Uint8Array

    constructor(bios: Uint8Array | undefined, rom: Uint8Array, gpu: GPU, joypad: Joypad) {
        if (bios) {
            this._bios = bios
            this._biosMapped = true
        }
        this._rom = rom
        this._gpu = gpu
        this._joypad = joypad
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
        } else if (addr >= GPU.VRAM_BEGIN && addr <= GPU.VRAM_END) {
            value = this._gpu.vram[addr - GPU.VRAM_BEGIN]
        } else if (addr >= 0xa000 && addr <= 0xbfff) {
            value = 0 // TODO: define
        } else if (addr >= 0xc000 && addr <= 0xdfff) {
            value = this._workingRam[addr - 0xc000]
        } else if (addr >= 0xff00 && addr <= 0xff7f) {
            value = this.readIO(addr)
        } else if (addr >= 0xff80 && addr <= 0xffff) {
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
        } else if (addr >= 0xa000 && addr <= 0xbfff) {
            console.warn("Writing to external ram")
        } else if (addr >= 0xc000 && addr <= 0xdfff) {
            this._workingRam[addr - 0xc000] = value
        } else if (addr >= 0xfe00 && addr <= 0xfe9f) {
            this._gpu.writeOam(addr - GPU.OAM_BEGIN, value)
        } else if (addr >= 0xfea0 && addr <= 0xfeff) {
            // Unused
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
            case 0xff00:
                return this._joypad.toByte()
            case 0xff40:
                return ((this._gpu.lcdDisplayEnabled ? 1 : 0) << 8) |
                       ((this._gpu.windowTileMap === WindowTileMap.x9c00 ? 1 : 0) << 7) |
                       ((this._gpu.windowDisplayEnabled ? 1 : 0) << 6) |
                       ((this._gpu.backgroundAndWindowDataSelect === BackgroundAndWindowDataSelect.x8000 ? 1 : 0) << 5) |
                       ((this._gpu.backgroundTileMap === BackgroundTileMap.x9c00 ? 1 : 0) << 4) |
                       ((this._gpu.objectSize === ObjectSize.os16x16 ? 1 : 0) << 3) |
                       ((this._gpu.objectDisplayEnable ? 1 : 0) << 2) |
                       (this._gpu.backgroundDisplayEnabled ? 1 : 0)
            case 0xff41:
                console.warn("Reading lcd status register 0xff41. TODO: implement interrupt status")
                return this._gpu.mode
            case 0xff42:
                return this._gpu.scrollY
            case 0xff43:
                return this._gpu.scrollX
            case 0xff44: 
                return this._gpu.line
            case 0xff47:
                function colorToBits(color: Color): number {
                    switch (color) {
                        case Color.Black: return 0b11
                        case Color.DarkGray: return 0b10
                        case Color.LightGray: return 0b01
                        case Color.White: return 0b00
                    }
                }
                return (colorToBits(this._gpu.bgcolor3) << 6) | 
                       (colorToBits(this._gpu.bgcolor2) << 4) | 
                       (colorToBits(this._gpu.bgcolor1) << 2) | 
                       colorToBits(this._gpu.bgcolor0)
            default:
                throw new Error(`Reading unrecognized IO address 0x${toHex(addr)}`)

        }
    }

    buffer: string  = ""

    writeIO(addr: number, value: number) {
        switch (addr) {
            case 0xff00:
                this._joypad.column = (value & 0x10) !== 0 ? Column.Zero : Column.One
                return
            case 0xff01:
                this.buffer = this.buffer + String.fromCharCode(value)
                return
            case 0xff02:
                if (value === 0x81) { console.log(this.buffer) }
                return
            case 0xff07:
                console.warn(`Writing 0x${toHex(value)} to timer regsiter. Ignoring...`)
                return
            case 0xff0f:
                console.warn(`Writing 0x${toHex(value)} to interrupt register. Ignoring...`)
                return
            case 0xff10:
                // http://bgb.bircd.org/pandocs.htm#soundoverview
                // Channel 1 Sweep registe
            case 0xff11:
                // TODO: Channel 1 Sound length/Wave pattern
            case 0xff12:
                // TODO: Channel 1 Volume Envelope
            case 0xff13:
                // Channel 1 Frequency lo
            case 0xff14:
                // Channel 1 Frequency hi
            case 0xff16: 
                // Channel 2 Sound Length/Wave Pattern Duty 
            case 0xff17:
                // Channel 2 Volume Envelope
            case 0xff18: 
                // Channel 2 Frequency lo data
            case 0xff19:
                // Channel 2 Frequency hi data
            case 0xff1a:
                // Channel 3 Sound on/off
            case 0xff21: 
                // Channel 4 Volume Envelope
            case 0xff23:
                // Channel 4 Counter/consecutive
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
                this._gpu.backgroundAndWindowDataSelect = ((value >> 4) & 0b1) === 0 
                    ? BackgroundAndWindowDataSelect.x8800 
                    : BackgroundAndWindowDataSelect.x8000
                this._gpu.backgroundTileMap = ((value >> 3) & 0b1) === 0 ? BackgroundTileMap.x9800 : BackgroundTileMap.x9c00
                this._gpu.objectSize = ((value >> 2) & 0b1) === 0 ? ObjectSize.os8x8 : ObjectSize.os16x16
                this._gpu.objectDisplayEnable = ((value >> 1) & 0b1) === 1 
                this._gpu.backgroundDisplayEnabled = (value & 0b1) === 1 
                return

            case 0xff41:
                console.warn(`Writing 0x${value} to 0xff41. TODO: implement LCD stat reg`)
                return
            case 0xff42:
                this._gpu.scrollY = value
                return
            case 0xff43:
                this._gpu.scrollX = value
                return
            case 0xff47:
                this._gpu.bgcolor3 = bitsToColor(value >> 6)
                this._gpu.bgcolor2 = bitsToColor((value >> 4) & 0b11)
                this._gpu.bgcolor1 = bitsToColor((value >> 2) & 0b11)
                this._gpu.bgcolor0 = bitsToColor(value & 0b11)
                return
            case 0xff48:
                this._gpu.obj0color3 = bitsToColor(value >> 6)
                this._gpu.obj0color2 = bitsToColor((value >> 4) & 0b11)
                this._gpu.obj0color1 = bitsToColor((value >> 2) & 0b11)
                return
            case 0xff49:
                this._gpu.obj1color3 = bitsToColor(value >> 6)
                this._gpu.obj1color2 = bitsToColor((value >> 4) & 0b11)
                this._gpu.obj1color1 = bitsToColor((value >> 2) & 0b11)
                return
            case 0xff50:
                this._biosMapped = false
                return
            case 0xff7f: 
                console.warn(`Wrote 0x${toHex(value)} to 0xff7f. Ignoring`)
                return
            default:
                throw new Error(`Writting 0x${toHex(value)} to unrecognized IO address 0x${toHex(addr)}`)
        }
    }

    unmapBios() {
        this._biosMapped = false
    }
}
function bitsToColor(bits: number): Color {
    switch (bits) {
        case 0: return Color.White
        case 1: return Color.LightGray
        case 2: return Color.DarkGray
        case 3: return Color.Black
        default: throw new Error("Should not be possible")
    }
}

export default Bus