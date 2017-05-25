import * as React from 'react'
import * as ReactDOM from 'react-dom'

import GPU from 'cpu/GPU'

type Props = { gpu: GPU }
type State = { ctx: CanvasRenderingContext2D }
class TileSet extends React.Component<Props, State> {
    componentDidMount() {
        const canvas = ReactDOM.findDOMNode(this.refs.tileset) as HTMLCanvasElement
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
        return (
            <div>
                <canvas id="tileset" ref="tileset" />
            </div>
        )
    }

    flush(gpu: GPU, ctx: CanvasRenderingContext2D) {
        const tileSet = gpu.tileSet

        const valuesPerPixel = 4
        const tileWidth = 8
        const tileHeight = 8

        const effectiveWidth = tileWidth * valuesPerPixel
        const width = 8 
        const height = Math.trunc(tileSet.length / width) 

        const rowWidth = tileWidth * width * valuesPerPixel
        const canvasData: Uint8Array = new Uint8Array(tileSet.length * tileHeight * tileWidth * valuesPerPixel)

        tileSet.forEach((tile, tileIndex) => {
            const tileRow = Math.trunc(tileIndex / tileHeight)
            const tileColumn = tileIndex % tileWidth
            tile.forEach((row, rowIndex) => {
                const beginningOfCanvasRow = ((tileRow * tileHeight) + rowIndex) * rowWidth
                let index = beginningOfCanvasRow + (tileColumn * effectiveWidth)

                for (let pixel of row) {
                    const color = gpu.valueToColor(pixel)
                    canvasData[index] = color
                    canvasData[index + 1] = color
                    canvasData[index + 2] = color
                    canvasData[index + 3] = 255
                    index = index + 4
                }
            })
        })
        const canvasWidth = width * tileWidth
        const canvasHeight = height * tileHeight
        const data = new ImageData(
            Uint8ClampedArray.from(canvasData),
            canvasWidth,
            canvasHeight
        )

        ctx.putImageData(data, 0, 0)
    }
}

export default TileSet