import * as React from 'react'

class RomInput extends React.Component<{}, {}> {
    onChange (e: React.ChangeEvent<HTMLInputElement>) {
        const input = e.currentTarget
        const file = input.files && input.files[0]
        if (file) {
            const reader = new FileReader()
            const contents = new Blob([file])
            reader.readAsArrayBuffer(contents)
            reader.onload = () => {
                const rom = new Uint8Array(reader.result)
                console.log(rom)
            }
        }
    }

    render () {
        return <input type="file" accept=".gb" onChange={this.onChange}/>
    }
}

export default RomInput