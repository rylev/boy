import u8 from 'lib/u8'

enum GPUMode {
    HorizontalBlank,
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

export enum BackgroundAndWindowTileMap {
    x8000,
    x8800,
}

export enum ObjectSize {
    os8x8,
    os16x16
}

export enum Color {
    White = 255,
    LightGray = 192,
    DarkGray = 96,
    Black = 0
}

function blankTile(): TileValue[][] {
    return new Array(8).fill(0).map(_ => new Array(8).fill(TileValue.Zero))
}

class GPU {
    static readonly width = 160
    static readonly height = 144
    static readonly VRAM_BEGIN = 0x8000
    static readonly VRAM_END = 0x9fff
    static readonly NUMBER_OF_TILES = 384

    readonly vram = new Uint8Array(GPU.VRAM_END - GPU.VRAM_BEGIN + 1).fill(0)

    private _mode = GPUMode.HorizontalBlank
    private _canvas = new Uint8Array(GPU.width * GPU.height * 4)
    private _timer = 0
    private _draw: (data: ImageData) => void

    tileSet: TileValue[][][] = new Array(GPU.NUMBER_OF_TILES).fill(0).map(_ => blankTile())

    // Registers
    lcdDisplayEnabled: boolean = true
    windowDisplayEnabled: boolean = true
    backgroundDisplayEnabled: boolean = true
    windowTileMap: WindowTileMap = WindowTileMap.x9800
    backgroundTileMap: BackgroundTileMap = BackgroundTileMap.x9800
    backgroundAndWindowTileMap: BackgroundAndWindowTileMap = BackgroundAndWindowTileMap.x8000
    objectSize: ObjectSize = ObjectSize.os8x8
    objectDisplayEnable: boolean = true
    color0 = Color.White
    color1 = Color.LightGray
    color2 = Color.DarkGray
    color3 = Color.Black

    scrollX: number = 0
    scrollY: number = 0

    line = 0

    constructor(draw: ((data: ImageData) => void) | undefined) {
        this._draw = draw || (() => {})
        this._canvas = this._canvas.map(_ => Color.White)
        this.draw()
    }

    step(time: number) {
        this._timer += time

        switch (this._mode) {
            case GPUMode.HorizontalBlank:
                if (this._timer >= 204) {
                    this._timer = 0
                    this.line++

                    if (this.line === 143) {

                        this.draw()
                        this._mode = GPUMode.VerticalBlank
                    } else {
                        this._mode = GPUMode.OAMAccess
                    }
                }
                return
            case GPUMode.VerticalBlank:
                if (this._timer >= 456) {
                    this._timer = 0
                    this.line++

                    if (this.line > 153) {
                        this._mode = GPUMode.OAMAccess
                        this.line = 0
                    }
                }
                return
            case GPUMode.OAMAccess:
                if (this._timer >= 80) {
                    this._timer = 0
                    this._mode = GPUMode.VRAMAccess
                }
                return
            case GPUMode.VRAMAccess:
                if (this._timer >= 172) {
                    this._timer = 0
                    this._mode = GPUMode.HorizontalBlank

                    this.renderScan()
                }
                return
        }
    }

    writeVram(index: number, value: number) {
        this.vram[index] = value
        if (index >= 0x1800) { return }

        // Tiles are encoded in two bits with the first byte always
        // on an even address. Bitwise anding the address with 0xffe
        // gives us the address of the first byte of the tile.
        const normalizedAddr = index & 0xffe 
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

    renderScan() {
        const viewPortYOffset = u8.wrappingAdd(this.line, this.scrollY) 
        const tileOffset = Math.trunc(viewPortYOffset / 8) * 32

        const tileMapOffset = (this.backgroundTileMap - GPU.VRAM_BEGIN) + tileOffset
        // When line and scrollY are zero we just start at the top of the tile
        // If they're non-zero we must index into the tile cycling through 0 - 7
        const yOffset = (this.line + this.scrollY) % 8 

        let lineOffset = 0// Math.trunc(this.scrollX / 8) // Count up 1 every 8 steps
        let xOffset = 0 //this.scrollX % 8 // cycle through 0 - 7

        let canvasOffset = this.line * GPU.width * 4
        let tileIndex = this.vram[tileMapOffset + lineOffset]

        // if(this.backgroundTileMap === BackgroundTileMap.x9c00 && tileIndex < 128) {
        //     tileIndex += 256
        // } 

        for (var i = 0; i < 160; i++) {
            const value = this.tileSet[tileIndex][yOffset][xOffset]
            const color = this.valueToColor(value)
            this._canvas[canvasOffset] = color
            this._canvas[canvasOffset + 1] = color
            this._canvas[canvasOffset + 2] = color
            this._canvas[canvasOffset + 3] = 255
            canvasOffset += 4

            xOffset = xOffset + 1
            if (xOffset === 8) {
                xOffset = 0
                lineOffset = (lineOffset + 1) & 0x1f
                tileIndex = this.vram[tileMapOffset + lineOffset]
                // if (this.backgroundTileMap === BackgroundTileMap.x9c00 && tileIndex < 128) {
                //     tileIndex += 256
                // }
            }
        }
    }

    valueToColor(value: TileValue) {
        switch (value) {
            case TileValue.Zero: return this.color0
            case TileValue.One: return this.color1
            case TileValue.Two: return this.color2
            case TileValue.Three: return this.color3
        }
    }

    background1(): Uint8Array {
        return this.vram.slice(0x1800, 0x1bff)
    }

    draw() {
        this._draw(new ImageData(
            Uint8ClampedArray.from(this._canvas),
            GPU.width,
            GPU.height
        ))
    }
}

export default GPU