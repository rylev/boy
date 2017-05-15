import * as React from 'react'
import RomInput  from 'components/RomInput'
import CPU from 'cpu'
import Memory from 'components/Memory'

type Props = {}
type State = {
    bios: Uint8Array | undefined,
    rom: Uint8Array | undefined
}

class Main extends React.Component<Props, State> {
    constructor() {
        super()
        this.state = {bios: undefined, rom: undefined}
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

    render () {
        const { bios, rom} = this.state

        if (rom == undefined) {
            return (<div>
                {this.romInput()}
            </div>)
        } else {
            const cpu = new CPU(bios, rom)
            return (
                <div>
                    <Memory bus={cpu.bus} />
                </div>
            )
        }
    }
}

export default Main