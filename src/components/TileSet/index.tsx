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
                <canvas ref="tileset" />
            </div>
        )
    }

    flush(gpu: GPU, ctx: CanvasRenderingContext2D) {
        const tileSet = gpu.tileSet
        const tileWidth = 8
        const tileHeight = 8
        const width = 16 
        const height = Math.trunc(tileSet.length / width) 
        const valuesPerPixel = 4
        const canvasData: Uint8Array = new Uint8Array(tileSet.length * tileHeight * tileWidth * valuesPerPixel)

        tileSet.forEach((tile, tileIndex) => {
            const tileRow = Math.trunc(tileIndex / tileHeight)
            const tileColumn = tileIndex % tileWidth
            tile.forEach((row, rowIndex) => {
                const beginningOfCanvasRow = ((tileRow * tileHeight) + rowIndex) * (tileWidth * width) * valuesPerPixel
                let index = beginningOfCanvasRow + (tileColumn * tileWidth * valuesPerPixel)
                for (let pixel of row) {
                    canvasData[index] = gpu.valueToColor(pixel)
                    canvasData[index + 1] = gpu.valueToColor(pixel)
                    canvasData[index + 2] = gpu.valueToColor(pixel)
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

        ctx.clearRect(0,0, width, height)
        ctx.putImageData(data, 0, 0)
    }
}

export default TileSet