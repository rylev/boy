class Registers {
    a: number
    b: number
    c: number
    d: number
    e: number
    f: FlagRegister
    h: number
    l: number

    constructor() {
        this.a = 0
        this.b = 0
        this.c = 0
        this.d = 0
        this.e = 0
        this.f = new FlagRegister()
        this.h = 0
        this.l = 0
    }

    get bc(): number {
        return (this.b << 8) + this.c
    }

    get hl(): number {
        return (this.h << 8) + this.l
    }
    set hl(value: number) {
        this.h = (value & 0xFF00) >> 8
        this.l = (value & 0XFF)
    }
}

class FlagRegister {
    zero: boolean
    subtract: boolean
    halfCarry: boolean
    carry: boolean

    constructor() {
        this.zero = false
        this.subtract = false
        this.halfCarry = false 
        this.carry = false
    }

    toByte(): number {
        return (
            ((this.zero ? 1 : 0) << 8) &
            ((this.subtract ? 1 : 0) << 7) &
            ((this.halfCarry ? 1 : 0) << 6) &
            ((this.carry ? 1 : 0) << 5) 
        )
    }

}

export default Registers