import * as React from 'react'

import CPU from 'components/CPU'
import Memory from 'components/Memory'
import { CPU as CPUModel }from 'cpu'
import Debugger from 'Debugger'
import './internals.css'

const BYTE_SIZE = 8
type Props = { bios: Uint8Array | undefined, rom: Uint8Array }
type State = { 
    debug?: Debugger,
    cpu: CPUModel, 
    error?: Error, 
    memoryOffset: number 
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
                Breakpoints: {debug.breakpoints.join(",")}
            </div>
        )

    }

    error(): JSX.Element | null {
        const { error } = this.state
        if (error === undefined) { return null }

        return <div className="error">{error.message}</div>
    }

    controls(): JSX.Element {
        return (
            <div className="controls">
                {this.runButton()}
                {this.stepButton()}
                {this.resetButton()}
            </div>
        )
    }

    runButton(): JSX.Element | null {
        const { cpu, error } = this.state
        if (error) { return null }

        const onClick = () => {
            try {
                cpu.run(this.state.debug)
                this.forceUpdate()
            } catch (e) {
                this.setState({ error: e })
            }
        }
        return <button className="run control" onClick={onClick}>Run</button>
    }

    stepButton(): JSX.Element | null {
        const { cpu, error } = this.state
        if (error) { return null }

        const onClick = () => {
            try {
                cpu.step()
                this.setState({ cpu: cpu, memoryOffset: calculateMemoryOffset(this.state.cpu)})
            } catch (e) {
                this.setState({ error: e })
            }
        }
        return <button className="step control" onClick={onClick}>Step</button>
    }

    resetButton(): JSX.Element {
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
        return new CPUModel(props.bios, props.rom)
    }
}

function calculateMemoryOffset(cpu: CPUModel): number {
    return Math.trunc(cpu.pc / BYTE_SIZE)
}

export default Internals