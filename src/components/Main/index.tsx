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

    romInput(): JSX.Element | null {
        return (<div>
            <RomInput romUploaded={this.romUploaded} />
        </div>)
    }

    render () {
        const { bios, rom } = this.state

        if (rom == undefined) {
            return (<div className="page">
                {this.romInput()}
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