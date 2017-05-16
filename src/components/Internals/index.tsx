import * as React from 'react'

import CPU from 'components/CPU'
import Memory from 'components/Memory'
import { CPU as CPUModel }from 'cpu'
import './internals.css'

type Props = {bios: Uint8Array | undefined, rom: Uint8Array}
type State = {cpu: CPUModel, error?: Error}
class Internals extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { cpu: Internals.newCPU(props) }
    }

    componentWillRecieveProps(newProps: Props) {
        if (newProps !== this.props) {
            this.setState({ cpu: Internals.newCPU(newProps) })
        }
    }

    render(): JSX.Element {
        const { cpu } = this.state
        return (
            <div>
                {this.error()}
                {this.runButton()}
                {this.resetButton()}
                <div className="internals">
                    <CPU cpu={cpu}/>
                    <Memory bus={cpu.bus} pc={cpu.pc} />
                </div>
            </div>
        )
    }

    error(): JSX.Element | null {
        const { error } = this.state
        if (error === undefined) { return null }

        return <div className="error">{error.message}</div>
    }

    resetButton(): JSX.Element {
        const onClick = () => {
            this.setState({ cpu: Internals.newCPU(this.props), error: undefined })
        }
        return <button onClick={onClick}>Reset</button>
    }

    runButton(): JSX.Element | null {
        const { cpu, error } = this.state
        if (error) { return null }

        const onClick = () => {
            try {
                cpu.run()
            } catch (e) {
                this.setState({ error: e })
            }
        }
        return <button onClick={onClick}>Run</button>
    }

    static newCPU(props: Props): CPUModel {
        return new CPUModel(props.bios, props.rom)
    }
}

export default Internals