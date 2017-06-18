import { toHex } from 'lib/hex'
import GPU, { Color, WindowTileMap, BackgroundTileMap, BackgroundAndWindowDataSelect, ObjectSize, GPUMode } from './GPU'
import Joypad, { Column } from './Joypad'
import Timer from './Timer'
import InterruptFlag from './InterruptFlag'

class Bus {
    static VBLANK_VECTOR = 0x40
    static TIMER_VECTOR = 0x50
    static LCDSTAT_VECTOR = 0x48

    static BIOS_END = 0xff
    static ROM_BEGIN = 0x100
    static ROM_END = 0x7fff
    static VRAM_BEGIN = GPU.VRAM_BEGIN
    static VRAM_END = GPU.VRAM_END
    static EXTERNAL_RAM_BEGIN = 0xa000
    static EXTERNAL_RAM_END = 0xbfff
    static WORKING_RAM_BEGIN = 0xc000
    static WORKING_RAM_END = 0xdfff
    static OAM_BEGIN = GPU.OAM_BEGIN
    static OAM_END = GPU.OAM_END
    static MEMORY_MAPPED_IO_BEGIN = 0xff00
    static MEMORY_MAPPED_IO_END = 0xff7f
    static ZERO_PAGE_BEGIN = 0xff80
    static ZERO_PAGE_END = 0xfffe
    static INTERRUPT_ENABLE_REGISTER = 0xffff

    private _biosMapped: boolean
    private _bios: Uint8Array
    private _rom: Uint8Array
    private _gpu: GPU
    private _joypad: Joypad
    private _timer: Timer
    private _divider = new Timer(16384)
    private _zeroPagedRam = new Uint8Array(Bus.ZERO_PAGE_END - Bus.ZERO_PAGE_BEGIN + 1)
    private _workingRam = new Uint8Array(Bus.WORKING_RAM_END - Bus.WORKING_RAM_BEGIN + 1)
    readonly interruptFlag = new InterruptFlag()
    readonly interruptEnable = new InterruptFlag()

    constructor(bios: Uint8Array | undefined, rom: Uint8Array, joypad: Joypad) {
        if (bios !== undefined) {
            this._bios = bios
            this._biosMapped = true
        }
        this._rom = rom
        const interrupts = { 
            vblank: () => { this.interruptFlag.vblank = true; this.interruptFlag.lcdstat = true },
            hblank: () => this.interruptFlag.lcdstat = true,
            oamAccess: () => this.interruptFlag.lcdstat = true,
            lycLyCoincidence: () => this.interruptFlag.lcdstat = true
        }
        this._gpu = new GPU(interrupts)
        this._joypad = joypad
        this._timer = new Timer(4096, () => {
            this.interruptFlag.timer = true
        })
        this._divider.on = true
    }

    step(cycles: number) {
        this._timer.step(cycles)
        this._divider.step(cycles)
        this._gpu.step(cycles)
    }

    get biosMapped(): boolean {
        return this._biosMapped
    }

    get bios(): Uint8Array {
        return this._bios
    }

    get gpu(): GPU {
        return this._gpu
    }

    get rom(): Uint8Array {
        return this._rom
    }

    get hasInterrupt(): boolean {
        return (this.interruptEnable.vblank && this.interruptFlag.vblank) ||
               (this.interruptEnable.lcdstat && this.interruptFlag.lcdstat) ||
               (this.interruptEnable.timer && this.interruptFlag.timer) ||
               (this.interruptEnable.serial && this.interruptFlag.serial) ||
               (this.interruptEnable.joypad && this.interruptFlag.joypad) 
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
        if (addr <= Bus.BIOS_END && this._biosMapped) {
            value = this._bios[addr]
        } else if (addr <= Bus.ROM_END) {
            value = this._rom[addr]
        } else if (addr >= Bus.VRAM_BEGIN && addr <= Bus.VRAM_END) {
            value = this._gpu.vram[addr - Bus.VRAM_BEGIN] // TODO: move array indexing into GPU
        } else if (addr >= Bus.EXTERNAL_RAM_BEGIN && addr <= Bus.EXTERNAL_RAM_END) {
            throw new Error("Reading external ram is not yet supported") // TODO: implement external ram
        } else if (addr >= Bus.WORKING_RAM_BEGIN && addr <= Bus.WORKING_RAM_END) {
            value = this._workingRam[addr - Bus.WORKING_RAM_BEGIN]
        } else if (addr >= Bus.OAM_BEGIN && addr <= Bus.OAM_END) {
            value = this._gpu.oam[addr - Bus.OAM_BEGIN]
        } else if (addr >= Bus.MEMORY_MAPPED_IO_BEGIN && addr <= Bus.MEMORY_MAPPED_IO_END) {
            value = this.readIO(addr)
        } else if (addr >= Bus.ZERO_PAGE_BEGIN && addr <= Bus.ZERO_PAGE_END) {
            value = this._zeroPagedRam[addr - Bus.ZERO_PAGE_BEGIN]
        } else if (addr === Bus.INTERRUPT_ENABLE_REGISTER) {
            value = this.interruptEnable.toByte()
        } 

        if (value === undefined) { throw new Error(`No value at address 0x${toHex(addr)}`)}
        return value
    }

    write(addr: number, value: number) {
        if (addr <= Bus.BIOS_END && this._biosMapped) {
            throw new Error("Cannot write to bios")
        } else if (addr <= Bus.ROM_END) {
            this._rom[addr] = value
        } else if (addr >= Bus.VRAM_BEGIN && addr <= Bus.VRAM_END) {
            this._gpu.writeVram(addr - Bus.VRAM_BEGIN, value)
        } else if (addr >= Bus.EXTERNAL_RAM_BEGIN && addr <= Bus.EXTERNAL_RAM_END) {
            throw new Error("External RAM not yet implemented") // TODO: implement external ram
        } else if (addr >= Bus.WORKING_RAM_BEGIN && addr <= Bus.WORKING_RAM_END) {
            this._workingRam[addr - Bus.WORKING_RAM_BEGIN] = value
        } else if (addr >= Bus.OAM_BEGIN && addr <= Bus.OAM_END) {
            this._gpu.writeOam(addr - Bus.OAM_BEGIN, value)
        } else if (addr >= 0xfea0 && addr <= 0xfeff) {
            // This region of memory is unused and writing to it has no effect
        } else if (addr >= Bus.MEMORY_MAPPED_IO_BEGIN && addr <= Bus.MEMORY_MAPPED_IO_END) {
            this.writeIO(addr, value)
        } else if (addr >= Bus.ZERO_PAGE_BEGIN && addr <= Bus.ZERO_PAGE_END) {
            this._zeroPagedRam[addr - Bus.ZERO_PAGE_BEGIN] = value
        } else if (addr === Bus.INTERRUPT_ENABLE_REGISTER) {
            this.interruptEnable.fromByte(value)
        } else {
            throw new Error(`Unrecognized address 0x${toHex(addr)}`)
        }
    }

    readIO(addr: number): number {
        switch (addr) {
            case 0xff00:
                return this._joypad.toByte()
            case 0xff04:
                return this._divider.value
            case 0xff0f:
                return this.interruptFlag.toByte()
            case 0xff1c:
                // TODO: Channel 3 Select output level
                return 0
            case 0xff40:
                return ((this._gpu.lcdDisplayEnabled ? 1 : 0) << 7) |
                       ((this._gpu.windowTileMap === WindowTileMap.x9c00 ? 1 : 0) << 6) |
                       ((this._gpu.windowDisplayEnabled ? 1 : 0) << 5) |
                       ((this._gpu.backgroundAndWindowDataSelect === BackgroundAndWindowDataSelect.x8000 ? 1 : 0) << 4) |
                       ((this._gpu.backgroundTileMap === BackgroundTileMap.x9c00 ? 1 : 0) << 3) |
                       ((this._gpu.objectSize === ObjectSize.os16x16 ? 1 : 0) << 2) |
                       ((this._gpu.objectDisplayEnable ? 1 : 0) << 1) |
                       (this._gpu.backgroundDisplayEnabled ? 1 : 0)
            case 0xff41:
                return  ((this._gpu.lycLyCoincidenceInterruptEnabled ? 1 : 0) << 6) | 
                        ((this._gpu.oamInterruptEnabled ? 1 : 0) << 5) | 
                        ((this._gpu.vblankInterruptEnabled ? 1 : 0) << 4) | 
                        ((this._gpu.hblankInterruptEnabled ? 1 : 0) << 3) | 
                        ((this._gpu.line === this._gpu.lyc ? 1 : 0) << 2) | 
                        (this._gpu.mode)
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
                this._joypad.column = (value & 0x20) === 0 ? Column.One : Column.Zero
                return
            case 0xff01:
                this.buffer = this.buffer + String.fromCharCode(value)
                return
            case 0xff02:
                if (value === 0x81) { console.log(this.buffer) }
                return
            case 0xff03:
                console.warn(`Writing 0x${toHex(value)} which is unknown. Ignoring...`)
            case 0xff04:
                this._divider.value = 0
                return
            case 0xff05:
                this._timer.value = value
                return
            case 0xff06:
                this._timer.modulo = value
                return
            case 0xff07:
                switch (value & 0b11) {
                    case 0b00: this._timer.frequency = 4096; break
                    case 0b01: this._timer.frequency = 262144; break
                    case 0b10: this._timer.frequency = 65536; break
                    case 0b11: this._timer.frequency = 16384; break
                }
                this._timer.on = (value & 0b100) === 0b100
                return
            case 0xff08:
            case 0xff09:
            case 0xff0a:
            case 0xff0b:
            case 0xff0c:
            case 0xff0d:
            case 0xff0e:
                console.warn(`Writing 0x${toHex(value)} to register ${toHex(addr)} which is unknown. Ignoring...`)
                return 
            case 0xff0f:
                this.interruptFlag.fromByte(value)
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
            case 0xff1b:
                // Channel 3 Sound length
            case 0xff1c:
                // Channel 3 Select output level
            case 0xff1d:
                // Channel 3 Frequency's lower data
            case 0xff1e: 
                // Channel 3 Frequency's higher data
            case 0xff20: 
                // Channel 4 Sound Length
            case 0xff21: 
                // Channel 4 Volume Envelope
            case 0xff22:
                // Channel 4 Polynomial Counter
            case 0xff23:
                // Channel 4 Counter/consecutive
            case 0xff24:
                // TODO: Channel control / ON-OFF / Volume
            case 0xff25:
                // TODO: Selection of Sound output terminal
            case 0xff26:
                // TODO: Sound on/off
            case 0xff30:
            case 0xff31:
            case 0xff32:
            case 0xff33:
            case 0xff34:
            case 0xff35:
            case 0xff36:
            case 0xff37:
            case 0xff38:
            case 0xff39:
            case 0xff3a:
            case 0xff3b:
            case 0xff3c:
            case 0xff3d:
            case 0xff3e:
            case 0xff3f:
                //Wave Pattern RAM
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
                this._gpu.hblankInterruptEnabled = (value & 0b1000) === 0b1000
                this._gpu.vblankInterruptEnabled = (value & 0b10000) === 0b10000
                this._gpu.oamInterruptEnabled = (value & 0b100000) === 0b100000
                this._gpu.lycLyCoincidenceInterruptEnabled = (value & 0b1000000) === 0b1000000
                return
            case 0xff42:
                this._gpu.scrollY = value
                return
            case 0xff43:
                this._gpu.scrollX = value
                return
            case 0xff45: 
                this._gpu.lyc = value
                return 
            case 0xff46:
                // TODO: account for the fact this takes 160 microseconds
                const dmaSource = value << 8 
                const dmaDestination = 0xfe00
                for (let offset = 0; offset < 150; offset++) {
                    this.write(dmaDestination + offset, this.read(dmaSource + offset))
                }
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
            case 0xff4a:
                this._gpu.windowY = value
                return
            case 0xff4b:
                this._gpu.windowX = value
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