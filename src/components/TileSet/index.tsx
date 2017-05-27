import * as React from 'react'
import * as ReactDOM from 'react-dom'

import GPU from 'cpu/GPU'
import './tileSet.css'

type Props = { gpu: GPU }
type State = { ctx: CanvasRenderingContext2D }
class TileSet extends React.Component<Props, State> {
    componentDidMount() {
        const canvas = ReactDOM.findDOMNode(this.refs.tileSet) as HTMLCanvasElement
        const ctx = canvas.getContext('2d')
        if (ctx === null) { return }

        this.setState({ctx})

        const gpu =this.props.gpu
        this.flush(gpu, ctx)
    }

    componentWillReceiveProps(newProps: Props) {
        const gpu = newProps.gpu
        const ctx = this.state.ctx
        this.flush(gpu, ctx)
    }


    render() {
        return <canvas height="384" width="64" id="tileSet" ref="tileSet" /> 
    }

    flush(gpu: GPU, ctx: CanvasRenderingContext2D) {
        const tileSet = gpu.tileSet

        const valuesPerPixel = 4
        const tileWidth = 8
        const tileHeight = 8

        const widthInTiles = 8 
        const heightInTiles = Math.trunc(tileSet.length / widthInTiles) 

        const rowWidth = tileWidth * widthInTiles * valuesPerPixel
        const canvasData: Uint8Array = new Uint8Array(widthInTiles * heightInTiles * tileHeight * tileWidth * valuesPerPixel).fill(0)

        tileSet.forEach((tile, tileIndex) => {
            const tileRow = Math.trunc(tileIndex / widthInTiles)
            const tileColumn = tileIndex % widthInTiles
            tile.forEach((row, rowIndex) => {
                const beginningOfCanvasRow = ((tileRow * tileHeight) + rowIndex) * rowWidth
                let index = beginningOfCanvasRow + (tileColumn * tileWidth * valuesPerPixel)

                for (let pixel of row) {
                    const color = gpu.valueToColor(pixel)
                    canvasData[index] = color
                    canvasData[index + 1] = color
                    canvasData[index + 2] = color
                    canvasData[index + 3] = 255
                    index = index + valuesPerPixel
                }
            })
        })
        const canvasWidth = widthInTiles * tileWidth
        const canvasHeight = heightInTiles * tileHeight
        const data = new ImageData(
            Uint8ClampedArray.from(canvasData),
            canvasWidth,
            canvasHeight
        )

        ctx.putImageData(data, 0, 0)
    }
}

export default TileSet