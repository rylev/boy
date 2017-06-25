import * as Tone from 'tone'

export enum WavePatternDuty {
    wpd12_5 = 0.125,
    wpd25 = 0.25,
    wpd50 = 0.5,
    wpd75 = 0.75
}

export enum EnvelopeDiretion {
    Increase,
    Decrease
} 

function frequency(x: number): number {
    return 4194304 / ((2048 - x) << 5)
}

class Channel1 {
    wavePatternDuty = WavePatternDuty.wpd12_5
    volume = 0 
    envelopeDirection = EnvelopeDiretion.Decrease
    envelopeSweepNumber = 0
    frequency = 0
    counter = 0
    tone: any

    // The channel plays a frequency for a given amount of cycles
    initialFrequencyCount = 0x200
    foo = 0

    step() {
        (window as any).Tone = Tone
        if (this.foo === 0) { this.foo = this.initialFrequencyCount }
        this.foo = this.foo - 1
        if (this.foo === 0) {
            this.tone && console.log("silence")
            this.tone && (this.tone.volume.value = -50);
            (window as any).t = this.tone
        }
        
        // TODO
    }

    trigger() {
        console.log('trigger')
        if (this.tone === undefined) {
            this.tone = new Tone.PulseOscillator(frequency(this.frequency), this.wavePatternDuty).toMaster().start()
        } else {
            this.tone.frequency.value = this.frequency
        }
    }
}

class SoundOutput {
    volume: number = 0
    channel1 = false
    channel2 = false
    channel3 = false
    channel4 = false
}

class SoundController {
    cycles = 4096
    on = false
    readonly soundOutput1 = new SoundOutput()
    readonly soundOutput2 = new SoundOutput()
    readonly channel1 = new Channel1()

    step(cycles: number) {
        if (this.cycles > 0) {
            this.cycles = this.cycles - cycles
        }
        if (this.cycles <= 0) {
            this.cycles = 4096
            this.channel1.step()
        }
    }
}


export default SoundController