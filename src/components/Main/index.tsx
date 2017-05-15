import * as React from 'react'
import RomInput  from 'components/RomInput'
import CPU from 'components/CPU'
import { CPU as CPUModel }from 'cpu'
import Memory from 'components/Memory'

type Props = {}
type State = {
    bios: Uint8Array | undefined,
    rom: Uint8Array | undefined
    error: Error | undefined
}

class Main extends React.Component<Props, State> {
    constructor() {
        super()
        this.state = {bios: undefined, rom: undefined, error: undefined}
    }

    romUploaded = (rom: Uint8Array) => {
        this.setState({rom: rom})
    }

    romInput(): JSX.Element | null {
        return (<div>
            <p>Upload file</p>
            <RomInput romUploaded={this.romUploaded} />
        </div>)
    }

    runButton(cpu: CPUModel): JSX.Element {
        const onClick = () => {
            try {
                cpu.run()
            } catch (e) {
                this.setState({ error: e})
            }
        }
        return <button onClick={onClick}>Run</button>
    }

    render () {
        const { bios, rom, error } = this.state

        if (rom == undefined) {
            return (<div>
                {this.romInput()}
            </div>)
        } else {
            const cpu = new CPUModel(bios, rom)

            let errorMessage = null
            if (error != undefined) {
                errorMessage = <div>Error: {error.message}</div>
            }
            return (
                <div>
                    {errorMessage}
                    {cpu.isRunning ? null : this.runButton(cpu)}
                    <CPU cpu={cpu} />
                    <Memory bus={cpu.bus} pc={cpu.pc} />
                </div>
            )
        }
    }
}

export default Main