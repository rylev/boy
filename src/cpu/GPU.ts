import u8 from 'lib/u8'

export enum GPUMode {
    HorizontalBlank = 0,
    VerticalBlank,
    OAMAccess,
    VRAMAccess
}

export enum TileValue {
    Zero = 0,
    One,
    Two,
    Three
}

export enum WindowTileMap {
    x9800 = 0x9800,
    x9c00 = 0x9c00
}

export enum BackgroundTileMap {
    x9800 = 0x9800,
    x9c00 = 0x9c00
}

export enum BackgroundAndWindowDataSelect {
    x8000 = 0x8000,
    x8800 = 0x8800,
}

export enum ObjectSize {
    os8x8,
    os16x16
}

enum ObjectPalette {
    Zero, 
    One
}

export enum Color {
    White = 255,
    LightGray = 192,
    DarkGray = 96,
    Black = 0
}

export type ObjectData  = {
    x: number,
    y: number,
    tile: number,
    palette: number,
    xflip: boolean,
    yflip: boolean,
    priority: boolean, 
}

type Interrupts = {
    vblank: () => void,
    hblank: () => void,
    oamAccess: () => void,
    lineEqualsLineCheck: () => void
}

function blankTile(): TileValue[][] {
    return new Array(8).fill(0).map(_ => new Array(8).fill(TileValue.Zero))
}

function emptyObjectData(): ObjectData {
    return {
        x: -8,
        y: -16,
        tile: 0,
        palette: 0,
        xflip: false,
        yflip: false,
        priority: false,
    }
}

class GPU {
    static readonly width = 160
    static readonly height = 144
    static readonly VRAM_BEGIN = 0x8000
    static readonly VRAM_END = 0x9fff
    static readonly OAM_BEGIN = 0xfe00
    static readonly OAM_END = 0xfe9f
    static readonly NUMBER_OF_TILES = 384
    static readonly NUMBER_OF_OBJECTS = 40

    readonly vram = new Uint8Array(GPU.VRAM_END - GPU.VRAM_BEGIN + 1).fill(0)
    readonly oam = new Uint8Array(GPU.OAM_END - GPU.OAM_BEGIN + 1).fill(0)

    private _interrupts: Interrupts
    lineEqualsLineCheckInterruptEnabled = false
    oamInterruptEnabled = false
    vblankInterruptEnabled = false
    hblankInterruptEnabled = false

    private _mode = GPUMode.HorizontalBlank
    private _canvas = new Uint8Array(GPU.width * GPU.height * 4)
    private _cycles = 0
    onDraw: ((data: ImageData) => void) | undefined

    readonly tileSet: TileValue[][][] = new Array(GPU.NUMBER_OF_TILES).fill(0).map(_ => blankTile())
    readonly objectData: ObjectData[] = new Array(GPU.NUMBER_OF_OBJECTS).fill(0).map(_ => emptyObjectData())

    // Registers
    lcdDisplayEnabled: boolean = true
    windowDisplayEnabled: boolean = true
    backgroundDisplayEnabled: boolean = true
    windowTileMap: WindowTileMap = WindowTileMap.x9800
    backgroundTileMap: BackgroundTileMap = BackgroundTileMap.x9800
    backgroundAndWindowDataSelect: BackgroundAndWindowDataSelect = BackgroundAndWindowDataSelect.x8000
    objectSize: ObjectSize = ObjectSize.os8x8
    objectDisplayEnable: boolean = true
    objectPalette: ObjectPalette = ObjectPalette.Zero
    bgcolor0 = Color.White
    bgcolor1 = Color.LightGray
    bgcolor2 = Color.DarkGray
    bgcolor3 = Color.Black

    obj0color1 = Color.LightGray
    obj0color2 = Color.DarkGray
    obj0color3 = Color.Black

    obj1color1 = Color.LightGray
    obj1color2 = Color.DarkGray
    obj1color3 = Color.Black

    scrollX: number = 0
    scrollY: number = 0

    windowX: number = 0
    windowY: number = 0

    line = 0
    lineCheck = 0
    lineEqualsLineCheck = false

    get mode(): GPUMode { return this._mode }

    constructor(interrupts: Interrupts) {
        this._interrupts = interrupts
        this._canvas = this._canvas.map(_ => Color.White)
    }

    step(cycles: number) {
        this._cycles += cycles

        switch (this._mode) {
            case GPUMode.HorizontalBlank:
                if (this._cycles >= 204) {
                    this._cycles = 0
                    this.line++

                    if (this.line === 143) {
                        this.draw()
                        // TODO: Vblank actually has two different interrupts. We migt have to differntiate
                        this._interrupts.vblank()
                        this._mode = GPUMode.VerticalBlank
                    } else {
                        this._mode = GPUMode.OAMAccess
                        if (this.oamInterruptEnabled ) { this._interrupts.oamAccess() }
                    }
                }
                this.setLycLyCoincidence()
                return
            case GPUMode.VerticalBlank:
                if (this._cycles >= 456) {
                    this._cycles = 0
                    this.line++

                    if (this.line > 153) {
                        this._mode = GPUMode.OAMAccess
                        if (this.oamInterruptEnabled ) { this._interrupts.oamAccess() }
                        this.line = 0
                    }
                }
                this.setLycLyCoincidence()
                return
            case GPUMode.OAMAccess:
                if (this._cycles >= 80) {
                    this._cycles = 0
                    this._mode = GPUMode.VRAMAccess
                }
                return
            case GPUMode.VRAMAccess:
                if (this._cycles >= 172) {
                    this._cycles = 0
                    if (this.hblankInterruptEnabled) { this._interrupts.hblank() }
                    this._mode = GPUMode.HorizontalBlank

                    this.renderScan()
                }
                return
        }
    }

    setLycLyCoincidence() {
        if (this.line === this.lineCheck) {
            this.lineEqualsLineCheck = true
            if (this.lineEqualsLineCheckInterruptEnabled) {
                this._interrupts.lineEqualsLineCheck()
            }
        } else {
            this.lineEqualsLineCheck = false
        }
    }

    writeVram(index: number, value: number) {
        this.vram[index] = value
        if (index >= 0x1800) { return }

        // Tiles are encoded in two bits with the first byte always
        // on an even address. Bitwise anding the address with 0xffe
        // gives us the address of the first byte of the tile.
        const normalizedAddr = index & 0xfffe 
        const tileIndex = Math.trunc(index / 16) // Tiles begin every 16 bytes
        const y = Math.trunc((index % 16) / 2) // Every two bytes is a new row
        const vram1 = this.vram[normalizedAddr]
        const vram2 = this.vram[normalizedAddr + 1]

        for (let x = 0; x < 8; x++) {
            const bitMask = (1 << (7 - x))

            const lsb = vram1 & bitMask
            const msb = vram2 & bitMask
            const lsbValue = lsb > 0 ? TileValue.One : TileValue.Zero 
            const msbValue = msb > 0 ? TileValue.Two : TileValue.Zero

            this.tileSet[tileIndex][y][x] = msbValue + lsbValue
        }
    }

    writeOam(index: number, value: number) {
        this.oam[index] = value
        const objectIndex = Math.trunc(index / 4)
        if (objectIndex < GPU.NUMBER_OF_OBJECTS) {
            const byte = index % 4
            const data = this.objectData[objectIndex]
            switch (byte) {
                case 0: 
                    data.y = value - 16
                    break
                case 1: 
                    data.x = value - 8
                    break
                case 2:
                    data.tile = value
                    break
                case 3:
                    data.palette = (value & 0x10) !== 0 ? ObjectPalette.One : ObjectPalette.Zero
                    data.xflip = (value & 0x20) !== 0
                    data.yflip = (value & 0x40) !== 0
                    data.priority = (value & 0x80) === 0
                    break
            }
        }
    }

    renderScan() {
        const scanRow: TileValue[] = []
        if (this.backgroundDisplayEnabled) {
            // The current scan line's y-coordinate in the entire background space is a combination 
            // of both the line inside the view port we're currently on and the amount of scroll y there is.
            const yOffset = u8.wrappingAdd(this.line, this.scrollY) 
            // The current tile we're on is equal to the total y offset we have broken up into 8 pixel chunks 
            // and multipled by the width of the entire background (i.e. 32)
            const tileOffset = Math.trunc(yOffset / 8) * 32

            const tileMapBegin = this.backgroundTileMap - GPU.VRAM_BEGIN
            const tileMapOffset = tileMapBegin + tileOffset
            // When line and scrollY are zero we just start at the top of the tile
            // If they're non-zero we must index into the tile cycling through 0 - 7
            const tileYOffset = yOffset % 8 

            let xOffset = Math.trunc(this.scrollX / 8)
            let tileXOffset = this.scrollX % 8 

            let canvasOffset = this.line * GPU.width * 4
            let tileIndex = this.vram[tileMapOffset + xOffset]

            if(this.backgroundAndWindowDataSelect === BackgroundAndWindowDataSelect.x8800 && tileIndex < 128) {
                tileIndex += 256
            } 

            for (var i = 0; i < 160; i++) {
                const value = this.tileSet[tileIndex][tileYOffset][tileXOffset]
                const color = this.valueToBgColor(value)
                this._canvas[canvasOffset] = color
                this._canvas[canvasOffset + 1] = color
                this._canvas[canvasOffset + 2] = color
                this._canvas[canvasOffset + 3] = 255
                canvasOffset += 4
                scanRow[i] = value

                tileXOffset = tileXOffset + 1
                if (tileXOffset === 8) {
                    tileXOffset = 0
                    xOffset = (xOffset + 1) & 0x1f
                    tileIndex = this.vram[tileMapOffset + xOffset]
                    if (this.backgroundAndWindowDataSelect === BackgroundAndWindowDataSelect.x8800 && tileIndex < 128) {
                        tileIndex += 256
                    } 
                }
            }
        }

        if (this.objectDisplayEnable) {
            this.objectData.forEach(object => {
                if (object.y <= this.line && object.y + 8 > this.line) {
                    let canvasoffs = (this.line * 160 + object.x) * 4
                    const tile = this.tileSet[object.tile]
                    let tileRow: TileValue[] = [] 
                    if (object.yflip) {
                        tileRow = tile[7 - (this.line - object.y)]
                    } else {
                        tileRow = tile[this.line - object.y]
                    }

                    for (var x = 0; x < 8; x++) {
                        if ((object.x + x) >= 0 && (object.x + x) < 160 &&
                            tileRow[x] !== TileValue.Zero &&
                            (object.priority || scanRow[object.x + x] === TileValue.Zero)) {
                            const pixel = tileRow[object.xflip ? (7 - x) : x]
                            const color = this.valueToObjectColor(pixel)

                            this._canvas[canvasoffs + 0] = color
                            this._canvas[canvasoffs + 1] = color
                            this._canvas[canvasoffs + 2] = color
                            this._canvas[canvasoffs + 3] = 255

                        }
                        canvasoffs += 4;
                    }
                }
            })
        }
    }

    valueToBgColor(value: TileValue) {
        switch (value) {
            case TileValue.Zero: return this.bgcolor0
            case TileValue.One: return this.bgcolor1
            case TileValue.Two: return this.bgcolor2
            case TileValue.Three: return this.bgcolor3
        }
    }

    valueToObjectColor(value: TileValue) {
        switch (value) {
            case TileValue.Zero: throw "Objects should not have use tile value zero. This should be transparent"
            case TileValue.One: return this.objectPalette === ObjectPalette.Zero ? this.obj0color1 : this.obj1color1
            case TileValue.Two: return this.objectPalette === ObjectPalette.Zero ? this.obj0color2 : this.obj1color2
            case TileValue.Three: return this.objectPalette === ObjectPalette.Zero ? this.obj0color3 : this.obj1color3
        }
    }

    background1(): Uint8Array {
        return this.vram.slice(0x1800, 0x1c00)
    }

    draw() {
        this.onDraw && this.onDraw(new ImageData(
            Uint8ClampedArray.from(this._canvas),
            GPU.width,
            GPU.height
        ))
    }
}

export default GPU