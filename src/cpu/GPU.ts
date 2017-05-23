import u8 from 'lib/u8'

enum GPUMode {
    HorizontalBlank,
    VerticalBlank,
    OAMAccess,
    VRAMAccess
}

enum TileValue {
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

const WHITE = 255
const tile = new Array(8).fill(new Array(8).fill(TileValue.Zero))

class GPU {
    static readonly width = 160
    static readonly height = 144
    static readonly VRAM_BEGIN = 0x8000
    static readonly VRAM_END = 0x9fff
    static readonly NUMBER_OF_TILES = 384

    readonly vram = new Uint8Array(GPU.VRAM_END - GPU.VRAM_BEGIN + 1)

    private _tileSet: TileValue[][][] = new Array(GPU.NUMBER_OF_TILES).fill(tile)
    private _mode = GPUMode.HorizontalBlank
    private _canvas = new Uint8Array(GPU.width * GPU.height * 4)
    private _timer = 0
    private _draw: (data: ImageData) => void

    // Registers
    lcdDisplayEnabled: boolean = true
    windowDisplayEnabled: boolean = true
    backgroundDisplayEnabled: boolean = true
    windowTileMap: WindowTileMap = WindowTileMap.x9800
    backgroundTileMap: BackgroundTileMap = BackgroundTileMap.x9800
    backgroundAndWindowTileMap: BackgroundAndWindowTileMap = BackgroundAndWindowTileMap.x8000
    objectSize: ObjectSize = ObjectSize.os8x8
    objectDisplayEnable: boolean = true
    color0 = Color.Black
    color1 = Color.DarkGray
    color2 = Color.LightGray
    color3 = Color.White

    scrollX: number 
    scrollY: number

    line = 0

    constructor(draw: (data: ImageData) => void) {
        this._draw = draw
        this._canvas = this._canvas.map(_ => WHITE)
    }

    step(time: number) {
        this._timer += time

        switch (this._mode) {
            case GPUMode.HorizontalBlank:
                if (this._timer >= 204) {
                    this._timer = 0
                    this.line++

                    if (this.line === 143) {
                        this._mode = GPUMode.VerticalBlank
                        console.log(this._canvas.filter(x => x!== 255).length)
                        this._draw(new ImageData(
                            Uint8ClampedArray.from(this._canvas),
                            GPU.width,
                            GPU.height
                        ))
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
        // 0x8010 => 0x8190
        this.vram[index] = value
        if (index >= 0x1800) { return }

        const tileIndex = Math.trunc(index / 16)
        const y = Math.trunc((index % 16) / 2)

        for (let x = 0; x < 8; x++) {
            const bitMask = (1 << (7 - x))

            const lsb = this.vram[index] & bitMask
            const msb = this.vram[index + 1] & bitMask
            const lsbValue = lsb == 1 ? TileValue.One : TileValue.Zero 
            const msbValue = msb == 1 ? TileValue.Two : TileValue.Zero
            this._tileSet[tileIndex][y][x] = msbValue + lsbValue
        }
    }

    renderScan() {
        const mapline = u8.wrappingAdd(this.line, scrollY) 
        const mapOffset = (this.backgroundTileMap - GPU.VRAM_BEGIN) + mapline
        let lineOffset = this.scrollX >> 3 // TODO: why 3

        let x = this.scrollX & 7 // TODO: why 7
        const y = (this.line + this.scrollY) & 7 // TODO: why 7

        let canvasOffset = this.line * GPU.width * 4
        console.log('Reading from vram', (mapOffset + lineOffset).toString(16))
        let tileIndex = this.vram[mapOffset + lineOffset]
        if(this.backgroundTileMap === BackgroundTileMap.x9c00 && tileIndex < 128) {
            tileIndex += 256
        }

        for (var i = 0; i < 160; i++) {
            // Re-map the tile pixel through the palette
            const value = this._tileSet[tileIndex][y][x]
            const color = this.valueToColor(value)
            this._canvas[canvasOffset] = color
            this._canvas[canvasOffset + 1] = color
            this._canvas[canvasOffset + 2] = color
            this._canvas[canvasOffset + 3] = 255 
            canvasOffset += 4

            x = x + 1
            if (x === 8) {
                x = 0
                lineOffset = (lineOffset + 1) & 31
                tileIndex = this.vram[mapOffset + lineOffset];
                if(this.backgroundTileMap === BackgroundTileMap.x9c00 && tileIndex < 128) {
                    tileIndex += 256
                }
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
}

export default GPU