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
        this.f = FlagRegister.init()
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

type FlagRegister = {
    zero: boolean,
    subtract: boolean,
    halfCarry: boolean,
    carry: boolean
}

namespace FlagRegister {
    export function init(): FlagRegister {
        return { zero: false, subtract: false, halfCarry: false, carry: false }
    }
}

export default Registers