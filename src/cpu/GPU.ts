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

enum WindowTileMap {
    x9800 = 0x9800,
    x9c00 = 0x9c00
}
enum BackgroundTileMap {
    x9800 = 0x9800,
    x9c00 = 0x9c00
}

enum BackgroundAndWindowTileMap {
    x8000,
    x8800,
}

enum ObjectSize {
    os8x8,
    os16x16
}

const WHITE = 255
const tile = new Array(8).fill(new Array(8).fill(TileValue.Zero))

class GPU {
    static readonly width = 160
    static readonly height = 144
    static readonly VRAM_BEGIN = 0x8000
    static readonly VRAM_END = 0x9ffff
    static readonly NUMBER_OF_TILES = 384

    readonly vram = new Uint8Array(GPU.VRAM_END - GPU.VRAM_END + 1)

    private _tileSet: TileValue[][][] = new Array(GPU.NUMBER_OF_TILES).fill(tile)
    private _mode = GPUMode.HorizontalBlank
    private _canvas = new Uint8Array(GPU.width * GPU.height * 4)
    private _timer = 0
    private _line = 0
    private _draw: (data: ImageData) => void

    // Registers
    lcdDisplayEnabled: boolean
    windowDisplayEnabled: boolean
    windowTileMap: WindowTileMap
    backgroundTileMap: BackgroundTileMap
    backgroundAndWindowTileMap: BackgroundAndWindowTileMap
    objectSize: ObjectSize
    objectDisplayEnable: boolean
    palette = [[255,255,255,255], [192,192,192,255], [ 96, 96, 96,255],[  0,  0,  0,255]] 

    scrollX: number 
    scrollY: number

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
                    this._line++

                    if (this._line === 143) {
                        this._mode = GPUMode.VerticalBlank
                        this._draw({
                            height: GPU.height,
                            width: GPU.width,
                            data: Uint8ClampedArray.from(this._canvas)
                        })
                    } else {
                        this._mode = GPUMode.OAMAccess
                    }
                }
                return
            case GPUMode.VerticalBlank:
                if (this._timer >= 456) {
                    this._timer = 0
                    this._line++

                    if (this._line > 153) {
                        this._mode = GPUMode.OAMAccess
                        this._line = 0
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
        const addr = (index + GPU.VRAM_BEGIN) & 0x1FFE
        const tile = (addr >> 4) & 511
        const y = (addr >> 1) & 7

        for (let x = 0; x < 8; x++) {
            const sx = 1 << (7 - x)

            this._tileSet[tile][y][x] = ((this.vram[addr] & sx) ? TileValue.One : TileValue.Zero) 
                + ((this.vram[addr + 1] & sx) ? TileValue.Two : TileValue.Zero)
        }

    }

    renderScan() {
        const mapline = u8.wrappingAdd(this._line, scrollY) >> 3 // TODO: why 3
        const mapOffset = (this.backgroundTileMap - GPU.VRAM_BEGIN) + mapline
        let lineOffset = this.scrollX >> 3 // TODO: why 3

        let x = this.scrollX & 7 // TODO: why 7
        const y = (this._line + this.scrollY) & 7 // TODO: why 7

        let canvasOffset = this._line * GPU.width * 4
        let tileIndex = this.vram[mapOffset + lineOffset]
        if(this.backgroundTileMap === BackgroundTileMap.x9c00 && tileIndex < 128) {
            tileIndex += 256
        }

        for (var i = 0; i < 160; i++) {
            // Re-map the tile pixel through the palette
            const color = this.palette[this._tileSet[tileIndex][y][x]]
            this._canvas[canvasOffset] = color[0]
            this._canvas[canvasOffset + 1] = color[1]
            this._canvas[canvasOffset + 2] = color[2]
            this._canvas[canvasOffset + 3] = color[3]
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
}

export default GPU