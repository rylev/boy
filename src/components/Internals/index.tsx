import * as React from 'react'

import CPU from 'components/CPU'
import Memory from 'components/Memory'
import Background from 'components/Background'
import TileSet from 'components/TileSet'
import { CPU as CPUModel }from 'cpu'
import Debugger from 'Debugger'
import './internals.css'

const BYTE_SIZE = 8

type Props = { 
    cpu: CPUModel,
    isRunning: boolean,
    step: () => void,
    stepFrame: () => void,
    addBreakPoint: (addr: number) => void
}
type State = { 
    memoryOffset: number,
}
class Internals extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        const { cpu } = this.props
        this.state = { 
            memoryOffset: calculateMemoryOffset(cpu), 
        }
    }

    render(): JSX.Element {
        const { memoryOffset } = this.state
        const { cpu } = this.props
        return (
            <div className="internals">
                <div className="motherboard">
                    <CPU cpu={cpu} pcClicked={this.pcClicked} spClicked={this.spClicked}/>
                    {this.memory()}
                </div>
                {this.props.children}
                {this.controls()}
            </div>
        )
    }

    memory() {
        const { memoryOffset } = this.state
        const { cpu, addBreakPoint } = this.props
        return (
            <div className="memory">
                <Memory
                    bus={cpu.bus}
                    pc={cpu.pc}
                    sp={cpu.sp}
                    offset={memoryOffset}
                    changeOffset={newOffset => this.setState({ memoryOffset: newOffset })}
                    onByteClick={addBreakPoint} />
                <div className="visualMemory">
                    <TileSet
                        gpu={cpu.gpu}
                        onClick={() => { }} />
                    <Background
                        gpu={cpu.gpu}
                        onClick={this.backgroundClicked} />
                </div>
            </div>
        )
    }

    pcClicked = () => {
        this.setState({memoryOffset: calculateMemoryOffset(this.props.cpu) })
    }

    spClicked = () => {
        this.setState({memoryOffset: Math.trunc(this.props.cpu.sp / BYTE_SIZE) })
    }

    backgroundClicked = () => {
        this.setState({memoryOffset: Math.trunc(this.props.cpu.gpu.backgroundTileMap / BYTE_SIZE) })
    }

    controls() {
        const { isRunning } = this.props
        if (isRunning) { return null }

        return (
            <div className="controls">
                {this.stepButton()}
                {this.stepFrameButton()}
            </div>
        )
    }

    stepFrameButton(): JSX.Element | null {
        return <button className="stepFrame control" onClick={this.stepFrame}>Step Frame</button>
    }

    stepButton(): JSX.Element | null {
        return <button className="step control" onClick={this.step}>Step</button>
    }

    step = () => {
        const { cpu, step } = this.props
        step()
        this.setState({ memoryOffset: calculateMemoryOffset(cpu)})
    }

    stepFrame = () => {
        const { cpu, stepFrame } = this.props
        stepFrame()
        this.setState({ memoryOffset: calculateMemoryOffset(cpu)})
    }
}

function calculateMemoryOffset(cpu: CPUModel): number {
    return Math.trunc(cpu.pc / BYTE_SIZE)
}

export default Internals