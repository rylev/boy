import * as React from 'react'
import RomInput  from 'components/RomInput'
import Internals from 'components/Internals'

import './main.css'

type Props = {}
type State = {
    bios?: Uint8Array,
    rom?: Uint8Array 
}

class Main extends React.Component<Props, State> {
    constructor() {
        super()
        this.state = {}
    }

    romUploaded = (rom: Uint8Array) => {
        this.setState({rom: rom})
    }

    biosUploaded = (bios: Uint8Array) => {
        this.setState({bios: bios})
    }

    biosUploadMessage(): JSX.Element | null {
        if (this.state.bios !== undefined) {
            return <div>BIOS has been uploaded!</div>
        }
        return null
    }

    render () {
        const { bios, rom } = this.state

        if (rom == undefined) {
            return (<div className="page">
                {this.biosUploadMessage()}
                <RomInput id="rom-input" romUploaded={this.romUploaded} label={"Upload Rom"} />
                <RomInput id="id-input" romUploaded={this.biosUploaded} label={"Upload Bios"} />
            </div>)
        } else {
            return (
                <div>
                    <Internals bios={bios} rom={rom} />
                </div>
            )
        }
    }
}

export default Main