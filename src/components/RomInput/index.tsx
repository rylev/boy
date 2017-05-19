import * as React from 'react'

import './romInput.css'

type Props = {
    label: string, 
    id: string,
    romUploaded: (rom: Uint8Array) => void 
}

class RomInput extends React.Component<Props, {}> {
    onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget
        const file = input.files && input.files[0]
        if (file) {
            const arrayReader = new FileReader()
            const urlReader = new FileReader()
            const contents = new Blob([file])
            arrayReader.readAsArrayBuffer(contents)
            arrayReader.onload = () => {
                const rom = new Uint8Array(arrayReader.result)
                this.props.romUploaded(rom)
            }
            urlReader.readAsDataURL(contents)
            urlReader.onload = () => {
                try {
                    localStorage.setItem(this.props.id, urlReader.result)
                } catch (e) {
                    // TODO: Handle Error
                    console.log("Storage failed: " + e)
                }
            }
        }
    }

    render () {
        return (
            <div className="rom-upload-button">
                <input id={this.props.id}  className="rom-input" type="file" accept=".gb" onChange={this.onChange}/>
                <label htmlFor={this.props.id} className='rom-input-label'>
                    {this.props.label}
                </label>
            </div>
        )
    }
}

export default RomInput