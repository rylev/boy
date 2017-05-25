import * as React from 'react'

import CPU from 'components/CPU'
import Memory from 'components/Memory'
import TileSet from 'components/TileSet'
import { CPU as CPUModel }from 'cpu'
import Debugger from 'Debugger'
import './internals.css'

const BYTE_SIZE = 8
type Props = { bios: Uint8Array | undefined, rom: Uint8Array }
type State = { 
    cpu: CPUModel, 
    memoryOffset: number,
    error?: Error, 
    cpuTask?: number,
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
        const { cpu } = this.state
        if (!cpu.isRunning) {
            return (
                <div className="controls">
                    {this.runButton()}
                    {this.stepButton()}
                    {this.resetButton()}
                </div>
            )
        } else {
            return (
                <div className="controls">
                    {this.stopButton()}
                </div>
            )

        }
    }

    runButton(): JSX.Element | null {
        const { cpu, error } = this.state
        if (error) { return null }

        const onClick = () => {
            const task = setInterval(() => {
                try {
                    cpu.run(this.state.debug)
                    this.forceUpdate()
                } catch (e) {
                    cpu.pause()
                    console.error(e)
                    clearInterval(task)
                    this.setState({ error: e, cpuTask: undefined })
                } finally {
                }
            }, 1000)
            this.setState({cpuTask: task})
        }
        return <button className="run control" onClick={onClick}>Run</button>
    }

    stepButton(): JSX.Element | null {
        const { error } = this.state
        if (error) { return null }

        const onClick = () => {
            const { cpu, cpuTask } = this.state
            try {
                cpu.step()
                if (cpuTask) { clearInterval(cpuTask) }
                this.setState({ cpuTask: undefined, memoryOffset: calculateMemoryOffset(this.state.cpu)})
            } catch (e) {
                this.setState({ error: e })
            }
        }
        return <button className="step control" onClick={onClick}>Step</button>
    }

    resetButton(): JSX.Element | null {
        const { cpu } = this.state
        
        const onClick = () => {
            const cpu = Internals.newCPU(this.props)
            this.setState({ 
                cpu: cpu, 
                error: undefined, 
                memoryOffset: calculateMemoryOffset(cpu)
            })
        }
        return <button className="reset control" onClick={onClick}>Reset</button>
    }

    stopButton (): JSX.Element {
        const onClick = () => {
            const { cpu, cpuTask } = this.state
            cpu.pause()
            if (cpuTask !== undefined) { clearInterval(cpuTask) }
            this.setState({ cpuTask: undefined })
        }

        return <button className="stop control" onClick={onClick}>Stop</button>
    }

    pcClicked = () => {
        this.setState({memoryOffset: calculateMemoryOffset(this.state.cpu) })
    }

    spClicked = () => {
        this.setState({memoryOffset: Math.trunc(this.state.cpu.sp / BYTE_SIZE) })
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