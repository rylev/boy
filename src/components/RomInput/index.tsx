import * as React from 'react'

import './romInput.css'

type Props = {romUploaded: (rom: Uint8Array) => void }

class RomInput extends React.Component<Props, {}> {
    onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget
        const file = input.files && input.files[0]
        if (file) {
            const reader = new FileReader()
            const contents = new Blob([file])
            reader.readAsArrayBuffer(contents)
            reader.onload = () => {
                const rom = new Uint8Array(reader.result)
                this.props.romUploaded(rom)
            }
        }
    }

    render () {
        return (
            <div className="rom-upload-button">
                <input id="romInput" className="rom-input" type="file" accept=".gb" onChange={this.onChange}/>
                <label htmlFor='romInput' className='rom-input-label'>
                    Upload ROM
                </label>
            </div>
        )
    }
}

export default RomInput