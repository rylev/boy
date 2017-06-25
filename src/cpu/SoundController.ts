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
    return Math.trunc(4194304 / ((2048 - x) << 5))
}

function volume(x: number): number {
    return -100 + (x * 8)
}

class Channel1 {
    wavePatternDuty = WavePatternDuty.wpd12_5

    length = 0

    frequency = 0
    private _sweepFrenquency = 0

    sweepPeriod = 0
    private _sweepCounter = 0

    tone: any

    //  Set to volume envelope period
    //  On the 7th step of the frame sequencer decrement
    //  When 0, increase or decrease volume according to 
    // volume envelope direction unless reached min/max
    volumeEnvelopeTimer = 0
    volumeEnvelopePeriod = 0
    envelopeDirection = EnvelopeDiretion.Decrease

    initialVolume = 0
    volume = 0 

    timer = 0

    step() {
        if (this.timer > 0) { this.timer = this.timer - 1 }
        if (this.timer === 0) {
            this.timer = (2048 - this.frequency) * 4
        }
    }

    stepVolumeEnvelope() {
        if (this.volumeEnvelopePeriod > 0) {
            if (this.volumeEnvelopeTimer > 0) { this.volumeEnvelopeTimer = this.volumeEnvelopeTimer - 1 }
            if (this.volumeEnvelopeTimer === 0) {
                if (this.envelopeDirection === EnvelopeDiretion.Increase) {
                    if (this.volume < 0xf) { this.volume = this.volume + 1 }
                } else {
                    if (this.volume > 0x0) { this.volume = this.volume - 1 }
                }
            }
        }
    }

    trigger() {
        this.timer = (2048 - this.frequency) * 4
        this.volumeEnvelopeTimer = this.volumeEnvelopePeriod
        this.volume = this.initialVolume

        this._sweepFrenquency = this.frequency
        // TODO: Set sweep

    }

    sample() {
        const freq = frequency(this._sweepFrenquency)
        if (this.tone === undefined) {
            this.tone = new Tone.PulseOscillator(freq, this.wavePatternDuty).toMaster().start()
        } else {
            this.tone.frequency.value = freq
            this.tone.width.value = this.wavePatternDuty
        }
        this.tone.volume.value = volume(this.volume)
    }
}

class SoundOutput {
    volume: number = 0
    channel1 = false
    channel2 = false
    channel3 = false
    channel4 = false
}

const SEQUENCE_TIMER = 8192
const SAMPLE_TIMER = Math.trunc(4194304 / 48000)
class SoundController {
    private _sequenceTimer = SEQUENCE_TIMER
    private _sequencerStep = 0
    on = false
    readonly soundOutput1 = new SoundOutput()
    readonly soundOutput2 = new SoundOutput()
    readonly channel1 = new Channel1()

    private _sampleTimer = SAMPLE_TIMER

    step(cycles: number) {
        this.channel1.step()
        if (this._sequenceTimer > 0) {
            this._sequenceTimer = this._sequenceTimer - cycles
        }
        if (this._sequenceTimer <= 0) {
            if (this._sequencerStep % 2 === 0) {
                // TODO: step length
            }
            if (this._sequencerStep === 2 || this._sequencerStep === 6) {
                //TODO: step sweep
            }

            if (this._sequencerStep === 7) {
                // TODO: step other channels 
                this.channel1.stepVolumeEnvelope()
            }

            this._sequencerStep = (this._sequencerStep + 1) % 8
            this._sequenceTimer = SEQUENCE_TIMER
        }

        if (this._sampleTimer > 0) { this._sampleTimer = this._sampleTimer - cycles }
        if (this._sampleTimer < 0) {
            if (this.on) {
                this.channel1.sample()
            }
            this._sampleTimer = SAMPLE_TIMER
        }
    }
}


export default SoundController