enum GPUMode {
    HorizontalBlank,
    VerticalBlank,
    OAMAccess,
    VRAMAccess
}

class GPU {
    static readonly width = 160
    static readonly height = 144
    static readonly VRAM_BEGIN = 0x8000
    static readonly VRAM_END = 0x9ffff

    readonly vram = new Uint8Array(GPU.VRAM_END + 1 - GPU.VRAM_END)

    private _mode = GPUMode.HorizontalBlank
    private _data = new Uint8Array(GPU.width * GPU.height * 4)
    private _timer = 0
    private _line = 0
    private _draw: (data: ImageData) => void

    constructor(draw: (data: ImageData) => void) {
        this._draw = draw
        for(let i=0; i < this._data.length; i++) {
		    this._data[i] = 255
        }
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
                            data: Uint8ClampedArray.from(this._data)
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

    renderScan() {

    }
}

export default GPU