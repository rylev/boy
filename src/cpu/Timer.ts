type TimerFrequency = 4096 | 262144 | 65536 | 16384

class Timer {
    frequency: TimerFrequency
    private readonly _interrupt: (() => void) | undefined

    on: boolean = false
    modulo: number = 0
    value: number = 0
    private _cycles = 0

    constructor(frequency: TimerFrequency, interrupt?: () => void  ) {
        this.frequency = frequency
        this._interrupt = interrupt
    }

    step(cycles: number) {
        if (this.on === false) { return }

        this._cycles += cycles
        let cyclesPerTick = this.cyclesPerTick()
        if (this._cycles > cyclesPerTick) {
            this.value += 1
            this._cycles = this._cycles % cyclesPerTick
        }
        if (this.value > 0xff) {
            this.value = this.modulo
            this._interrupt && this._interrupt()
        }
    }

    private cyclesPerTick(): number {
        // cyclesPerTick is the number of CPU cycles that occur
        // per tick of the clock. This is equal to the number of
        // cpu cycles per second (4194304) divided by the timer frequency.
        switch (this.frequency) {
            case 4096: 
                return 1024
            case 262144:
                return 16
            case 65536:
                return 64
            case 16384:
                return 256
        }
    }
}

export default Timer