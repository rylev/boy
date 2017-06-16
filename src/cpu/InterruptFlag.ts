class InterruptFlag {
    vblank = false
    lcdstat = false
    timer = false
    serial = false
    joypad = false

    get any(): boolean {
        return this.vblank || this.lcdstat || this.timer || this.serial || this.joypad
    }

    toByte(): number {
        return (0b11100000) | // unused bits always read as 1s
               ((this.joypad ? 1 : 0) << 4) |
               ((this.serial ? 1 : 0) << 3) |
               ((this.timer ? 1 : 0) << 2) |
               ((this.lcdstat ? 1 : 0) << 1) |
               (this.vblank ? 1 : 0)
    }

    fromByte(byte: number) {
        this.vblank  = (byte & 0b1) === 0b1
        this.lcdstat = (byte & 0b10) === 0b10
        this.timer   = (byte & 0b100) === 0b100
        this.serial  = (byte & 0b1000) === 0b1000
        this.joypad  = (byte & 0b10000) === 0b10000
        if (this.serial) { console.warn("Serial interrupt requested but not supported") }
        if (this.joypad) { console.warn("Joypad interrupt requested but not supported") }
    }
}

export default InterruptFlag