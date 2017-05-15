class Bus {
    private _biosMapped: boolean
    private _bios: Uint8Array
    private _rom: Uint8Array

    constructor(bios: Uint8Array | undefined, rom: Uint8Array) {
        if (bios) {
            this._bios = bios
            this._biosMapped = true
        }
        this._rom = rom
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

    read(addr: number): number {
        if (addr < 0x100 && this._biosMapped) {
            return this._bios[addr]
        } else if (addr < 0x8000) {
            return this._rom[addr]
        }
        return 0
    }

    unmapBios() {
        this._biosMapped = false
    }
}

export default Bus