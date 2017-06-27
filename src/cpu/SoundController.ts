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

class QuandrgularWaveChannel {
    enabled = false
    wavePatternDuty = WavePatternDuty.wpd12_5
    length = 0
    frequency = 0
    sweepPeriod = 0
    volumeEnvelopePeriod = 0
    envelopeDirection = EnvelopeDiretion.Decrease
    initialVolume = 0
    timer = 0

    private _tone: OscillatorNode | undefined
    private _gain: GainNode | undefined
    private _sweepFrenquency = 0
    private _sweepCounter = 0
    private _volume = 0 
    private _volumeEnvelopeTimer = 0
    private _hasSweep: boolean

    constructor(hasSweep: boolean) {
        this._hasSweep = hasSweep
    }

    step() {
        if (this.timer > 0) { this.timer = this.timer - 1 }
        if (this.timer === 0) {
            this.timer = (2048 - this.frequency) * 4
        }
    }

    stepVolumeEnvelope() {
        if (this.volumeEnvelopePeriod > 0) {
            if (this._volumeEnvelopeTimer > 0) { this._volumeEnvelopeTimer = this._volumeEnvelopeTimer - 1 }
            if (this._volumeEnvelopeTimer === 0) {
                if (this.envelopeDirection === EnvelopeDiretion.Increase) {
                    if (this._volume < 0xf) { this._volume = this._volume + 1 }
                } else {
                    if (this._volume > 0x0) { this._volume = this._volume - 1 }
                }
                this._volumeEnvelopeTimer = this.volumeEnvelopePeriod
            }
        }
    }

    trigger() {
        this.enabled = true
        this.timer = (2048 - this.frequency) * 4
        this._volumeEnvelopeTimer = this.volumeEnvelopePeriod
        this._volume = this.initialVolume

        this._sweepFrenquency = this.frequency
        // TODO: Set sweep
    }


    sample() {
        if (!this.enabled) { 
            if (this._tone) { this._tone.stop(); this._tone = undefined }
            return 
        }

        const freq = frequency(this._sweepFrenquency)
        if (this._tone === undefined) {
            // TODO: this is not always a square wave
            const ac = new AudioContext()
            const oscillator = ac.createOscillator()
            const gainNode = ac.createGain()
            gainNode.connect(ac.destination)
            oscillator.connect(gainNode)
            oscillator.type = 'square'
            oscillator.frequency.value = freq
            oscillator.start()
            this._tone = oscillator
            this._gain = gainNode
        } else {
            this._tone.frequency.setValueAtTime(freq, 0)
            // this._tone.width.value = this.wavePatternDuty
        }
        this._gain && (this._gain.gain.value = this._volume / 0xf)
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
    readonly channel1 = new QuandrgularWaveChannel(true)
    readonly channel2 = new QuandrgularWaveChannel(false)

    private _sampleTimer = SAMPLE_TIMER

    step(cycles: number) {
        for (let i = 0; i < cycles; i++) {
            this.channel1.step()
            this.channel2.step()

            if (this._sequenceTimer > 0) {
                this._sequenceTimer = this._sequenceTimer - 1
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
                    this.channel2.stepVolumeEnvelope()
                }

                this._sequencerStep = (this._sequencerStep + 1) % 8
                this._sequenceTimer = SEQUENCE_TIMER
            }

            if (this._sampleTimer > 0) { this._sampleTimer = this._sampleTimer - 1 }
            if (this._sampleTimer <= 0) {
                if (this.on) {
                    this.channel1.sample()
                    this.channel2.sample()
                }
                this._sampleTimer = SAMPLE_TIMER
            }

        }
    }
}


export default SoundController