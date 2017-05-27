import * as React from 'react'

import CPU from 'components/CPU'
import Memory from 'components/Memory'
import TileSet from 'components/TileSet'
import Background from 'components/Background'
import { CPU as CPUModel }from 'cpu'
import Debugger from 'Debugger'
import './internals.css'

const BYTE_SIZE = 8
enum RunningState {
    Running,
    Stopped,
    Paused
}

type Props = { bios: Uint8Array | undefined, rom: Uint8Array }
type State = { 
    cpu: CPUModel, 
    memoryOffset: number,
    error?: Error, 
    runningState?: RunningState,
    debug?: Debugger
}
class Internals extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        const cpu = Internals.newCPU(props)
        this.state = { 
            cpu: cpu, 
            memoryOffset: calculateMemoryOffset(cpu), 
        }
    }

    componentDidUpdate() {
        (window as any).cpu = this.state.cpu
    }

    componentWillReceiveProps(newProps: Props) {
        if (newProps !== this.props) {
            this.setState({ cpu: Internals.newCPU(newProps) })
        }
    }

    render(): JSX.Element {
        const { cpu, memoryOffset } = this.state
        return (
            <div>
                {this.error()}
                <canvas id="screen" height="144" width="160"/>
                <div className="internals">
                    <CPU cpu={cpu} pcClicked={this.pcClicked} spClicked={this.spClicked}/>
                    <Memory 
                        bus={cpu.bus} 
                        pc={cpu.pc} 
                        sp={cpu.sp}
                        offset={memoryOffset} 
                        changeOffset={newOffset => this.setState({memoryOffset: newOffset})}
                        onByteClick={this.addBreakPoint} 
                         />
                    <TileSet gpu={cpu.gpu}/>
                    <Background gpu={cpu.gpu} onClick={this.backgroundClicked} />
                </div>
                {this.debug()}
                {this.controls()}
            </div>
        )
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

    error(): JSX.Element | null {
        const { error } = this.state
        if (error === undefined) { return null }

        return <div className="error">{error.message}</div>
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
                {error ? null : this.runFrameButton()}
                {error ? null : this.stepButton()}
                {this.resetButton()}
            </div>
        )
    }

    runButton(): JSX.Element | null {
        return <button className="run control" onClick={this.run}>Run</button>
    }

    runFrameButton(): JSX.Element | null {
        return <button className="runFrame control" onClick={this.runFrame}>Run Frame</button>
    }

    stepButton(): JSX.Element | null {
        return <button className="step control" onClick={this.step}>Step</button>
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
            this.stepFrame(cpu, 0, true)
        })
    }

    runFrame = () => {
        const { cpu } = this.state
        cpu.unpause()
        this.setState({ runningState: RunningState.Running }, () => {
            this.stepFrame(cpu, 0, false)
        })
    }

    step = () => {
        const { cpu } = this.state
        try {
            cpu.step()
        } catch (e) {
            this.setState({ error: e })
        }
        this.setState({ memoryOffset: calculateMemoryOffset(cpu)})
    }

    reset = () => {
        const cpu = Internals.newCPU(this.props)
        this.setState({ 
            cpu: cpu, 
            error: undefined, 
            memoryOffset: calculateMemoryOffset(cpu)
        })
    }

    pause = () => {
        const { cpu } = this.state
        cpu.pause()
        this.setState({ runningState: RunningState.Paused })
    }

    pcClicked = () => {
        this.setState({memoryOffset: calculateMemoryOffset(this.state.cpu) })
    }

    spClicked = () => {
        this.setState({memoryOffset: Math.trunc(this.state.cpu.sp / BYTE_SIZE) })
    }

    backgroundClicked = () => {
        this.setState({memoryOffset: Math.trunc(this.state.cpu.gpu.backgroundTileMap / BYTE_SIZE) })
    }

    addBreakPoint = (addr: number) => {
        if (this.state.debug !== undefined) {
            this.state.debug.breakpoints.push(addr)
            this.setState({debug: this.state.debug})
        } else {
            const debug = new Debugger()
            debug.breakpoints.push(addr)
            this.setState({debug: debug})
        }
    }

    stepFrame(cpu: CPUModel, previousTimeDiff: number, runContinuously: boolean) {
        setTimeout(() => {
            const { runningState } = this.state
            if (runningState !== RunningState.Running) { return }

            const t1 = new Date().getTime()
            try {
                cpu.run(this.state.debug)
            } catch (e) {
                console.error(e)
                this.setState({ error: e, runningState: RunningState.Stopped })
                return 
            }
            const t2 = new Date().getTime()

            if (cpu.isPaused) { this.setState({runningState: RunningState.Paused})}

            if (runContinuously) { 
                let timeDiff = 16.7 - (t2 - t1)
                if (previousTimeDiff < 0) { timeDiff = timeDiff + previousTimeDiff }

                this.stepFrame(cpu, timeDiff, runContinuously)
            } else {
                this.setState({runningState: RunningState.Paused})
            }
            if (cpu.clockTicksInSecond > CPUModel.CLOCKS_PER_SECOND) { 
                cpu.clockTicksInSecond = 0
                this.setState({cpu: cpu})
            }
        }, Math.max(previousTimeDiff, 0))
    }


    static newCPU(props: Props): CPUModel {
        const draw = (data: ImageData) => { 
            const screen = document.getElementById('screen') as HTMLCanvasElement | null
            if (screen === null) { return }
            const context = screen.getContext('2d')
            if (context === null) { return }
            context.putImageData(data, 0, 0)
        }
        return new CPUModel(props.bios, props.rom, draw)
    }
}

function calculateMemoryOffset(cpu: CPUModel): number {
    return Math.trunc(cpu.pc / BYTE_SIZE)
}

export default Internals