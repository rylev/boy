import * as React from 'react'

import CPU from 'components/CPU'
import Screen from 'components/Screen'
import Internals from 'components/Internals'
import Memory from 'components/Memory'
import Background from 'components/Background'
import TileSet from 'components/TileSet'
import { CPU as CPUModel }from 'cpu'
import Joypad from 'cpu/Joypad'
import Debugger from 'Debugger'
import './gameboy.css'

const BYTE_SIZE = 8
enum RunningState {
    Running,
    Stopped,
    Paused
}

type Props = { bios: Uint8Array | undefined, rom: Uint8Array }
type State = { 
    cpu: CPUModel, 
    error?: Error, 
    runningState?: RunningState,
    debug?: Debugger,
}
class Gameboy extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        const cpu = this.newCPU(props)
        this.state = { 
            cpu: cpu,
            debug: new Debugger()
        }
    }

    componentDidUpdate() {
        (window as any).cpu = this.state.cpu
    }

    componentWillReceiveProps(newProps: Props) {
        if (newProps !== this.props) {
            this.setState({ cpu: this.newCPU(newProps) })
        }
    }

    render(): JSX.Element {
        const { cpu } = this.state
        return (
            <div className="gameboy">
                {this.error()}
                <Screen gpu={cpu.gpu}/>
                {this.controls()}
                <Internals 
                    cpu={cpu} 
                    step={this.step} 
                    stepFrame={this.stepFrame} 
                    addBreakPoint={this.addBreakPoint} 
                    isRunning={this.state.runningState === RunningState.Running}>
                    {this.debug()}
                </Internals>
            </div>
        )
    }

    error(): JSX.Element | null {
        const { error } = this.state
        if (error === undefined) { return null }

        return <div className="error">{error.message}</div>
    }

    addr: number

    updateAddr = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.addr = parseInt(e.target.value, 16)
    }
    submitBreakpoint = (e: React.FormEvent<HTMLFormElement>) => {
        this.addBreakPoint(this.addr)
        e.preventDefault()
    }

    debug(): JSX.Element | null {
        const { debug } = this.state
        if (debug === undefined) { return null }

        return (
            <div>
                <form onSubmit={this.submitBreakpoint}>
                    <input type="text" name="addr" onChange={this.updateAddr}/>
                    <input type="submit" value="Submit"/>
                </form>
                Breakpoints: {debug.breakpoints.map(bp => `0x${bp.toString(16)}`).join(",")}
            </div>
        )
    }

    controls(): JSX.Element {
        const { cpu, runningState, error } = this.state
        if (runningState === RunningState.Running) {
            return (
                <div className="controls">
                    {this.stopButton()}
                </div>
            )
        }

        return (
            <div className="controls">
                {error ? null : this.runButton()}
                {this.resetButton()}
            </div>
        )
    }

    runButton(): JSX.Element | null {
        return this.controlButton("run", this.run)
    }

    resetButton(): JSX.Element | null {
        return this.controlButton("reset", this.reset)
    }

    stopButton (): JSX.Element {
        return this.controlButton("stop", this.pause)
    }

    controlButton(label: string, onClick: () => void) {
        return (
            <div className={`${label} control`} onClick={onClick}>
                <div className={`${label} controlButton`}></div>
                <div className="controlLabel">{label.toUpperCase()}</div>
            </div>
        )

    }

    run = () => {
        const { cpu } = this.state
        cpu.unpause()
        this.setState({ runningState: RunningState.Running }, () => {
            this.step()
            this.runFrame(cpu, 0, true)
        })
    }

    stepFrame = () => {
        const { cpu } = this.state
        cpu.unpause()
        this.setState({ runningState: RunningState.Running }, () => {
            this.runFrame(cpu, 0, false)
        })
    }

    step = () => {
        const { cpu } = this.state
        cpu.unpause()
        cpu.step()
    }

    reset = () => {
        const cpu = this.newCPU(this.props)
        this.setState({ 
            cpu: cpu, 
            error: undefined, 
        })
    }

    pause = () => {
        const { cpu } = this.state
        cpu.pause()
        this.setState({ runningState: RunningState.Paused })
    }

    runFrame(cpu: CPUModel, previousTimeDiff: number, runContinuously: boolean) {
        setTimeout(() => {
            const { runningState } = this.state
            if (runningState !== RunningState.Running) { return }

            const timeLapse = cpu.runFrame(this.state.debug)
            let timeDiff = 16.7 - timeLapse

            if (runContinuously) { 
                if (previousTimeDiff < 0) { timeDiff = timeDiff + previousTimeDiff }

                this.runFrame(cpu, timeDiff, runContinuously)
            } else {
                cpu.pause()
            }
        }, Math.max(previousTimeDiff, 0))
    }

    addBreakPoint = (addr: number) => {
        const { debug } = this.state
        if (debug !== undefined) {
            const index = debug.breakpoints.indexOf(addr)
            if (index >= 0) {
                debug.breakpoints.splice(index, 1)
            } else {
                debug.breakpoints.push(addr)
            }
            this.setState({debug: this.state.debug})
        } else {
            const newDebug = new Debugger()
            newDebug.breakpoints.push(addr)
            this.setState({debug: newDebug})
        }
    }

    newCPU(props: Props): CPUModel {
        const onError = (e: Error) => { this.setState({error: e, runningState: RunningState.Stopped}) }
        const onPause = () => { this.setState({runningState: RunningState.Paused})}
        const onMaxClockCycles = () => { this.setState({cpu: cpu})}
        const cpu = new CPUModel(props.bios, props.rom, this.joypad(), { onError, onPause, onMaxClockCycles })
        return cpu
    }

    joypad() {
        const joypad = new Joypad()
        window.onkeydown = (e) => {
            switch (e.keyCode) {
                case 39: joypad.right = true; break;
                case 37: joypad.left = true; break;
                case 38: joypad.up = true; break;
                case 40: joypad.down = true; break;
                case 90: joypad.a = true; break;
                case 88: joypad.b = true; break;
                case 32: joypad.select = true; break;
                case 13: joypad.start = true; break;
            }
        }
        window.onkeyup = (e) => {
            switch (e.keyCode) {
                case 39: joypad.right = false; break;
                case 37: joypad.left = false; break;
                case 38: joypad.up = false; break;
                case 40: joypad.down = false; break;
                case 90: joypad.a = false; break;
                case 88: joypad.b = false; break;
                case 32: joypad.select = false; break;
                case 13: joypad.start = false; break;
            }
        }
        return joypad
    }
}

export default Gameboy