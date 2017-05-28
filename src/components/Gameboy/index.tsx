import * as React from 'react'

import CPU from 'components/CPU'
import Screen from 'components/Screen'
import Internals from 'components/Internals'
import Memory from 'components/Memory'
import Background from 'components/Background'
import TileSet from 'components/TileSet'
import { CPU as CPUModel }from 'cpu'
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
    debug?: Debugger
}
class Gameboy extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        const cpu = this.newCPU(props)
        this.state = { 
            cpu: cpu, 
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
                <Internals 
                    cpu={cpu} 
                    step={this.step} 
                    stepFrame={this.stepFrame} 
                    addBreakPoint={this.addBreakPoint} 
                    isRunning={this.state.runningState === RunningState.Running}>
                    {this.debug()}
                </Internals>
                {this.controls()}
            </div>
        )
    }

    error(): JSX.Element | null {
        const { error } = this.state
        if (error === undefined) { return null }

        return <div className="error">{error.message}</div>
    }

    debug(): JSX.Element | null {
        const { debug } = this.state
        if (debug === undefined) { return null }

        return (
            <div>
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
        return <button className="run control" onClick={this.run}>Run</button>
    }

    resetButton(): JSX.Element | null {
        return <button className="reset control" onClick={this.reset}>Reset</button>
    }

    stopButton (): JSX.Element {
        return <button className="stop control" onClick={this.pause}>Stop</button>
    }

    run = () => {
        const { cpu } = this.state
        cpu.unpause()
        this.setState({ runningState: RunningState.Running }, () => {
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
        const cpu = new CPUModel(props.bios, props.rom, { onError, onPause, onMaxClockCycles })
        return cpu
    }
}

export default Gameboy