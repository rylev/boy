import * as ReactDOM from 'react-dom'
import * as React from 'react'

import Main from 'components/Main'

const biosURL = localStorage.getItem('bios-input')
const romURL = localStorage.getItem('rom-input')
const biosReader =  new FileReader()
const romReader =  new FileReader()

if (biosURL) {
    const biosFile = dataURItoBlob(biosURL)
    biosReader.readAsArrayBuffer(biosFile)
}
if (romURL) {
    const romFile = dataURItoBlob(romURL)
    romReader.readAsArrayBuffer(romFile)
}

if (biosURL && romURL) {
    onLoad(biosReader, bios => {
        onLoad(romReader, rom => {
            render(bios, rom)
        })
    })
} else if (biosURL) {
    onLoad(biosReader, bios => {
        render(bios, undefined)
    })
} else if (romURL) {
    onLoad(romReader, rom => {
        render(undefined, rom)
    })
} else {
    render(undefined, undefined)
}

function onLoad(reader: FileReader, callback: (rom: Uint8Array) => void) {
    reader.onload = () => {
        const rom = new Uint8Array(reader.result)
        callback(rom)
    }
}

function render(bios: Uint8Array | undefined, rom: Uint8Array | undefined) {
    ReactDOM.render(
        <Main bios={bios} rom={rom} />,
        document.getElementById('main')
    )
}

function dataURItoBlob(dataURI: string): Blob {
    const binary = atob(dataURI.split(',')[1])
    var array = []
    for(var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {type: 'application/octet-stream'});
}
