enum GPUMode {
    HorizontalBlank,
    VerticalBlank,
    OAMAccess,
    VRAMAccess
}

class GPU {
    private _data: Uint8Array
    private _mode: GPUMode
    private _timer: number = 0
    private _line: number = 0
    width: number
    height: number

    constructor() {
        this.width = 160
        this.height = 144
        const dataLength = 160 * 144 * 4
        this._data = new Uint8Array(dataLength)
        for(let i=0; i < dataLength; i++) {
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
                        //TODO: Update DOM
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