import * as React from 'react'
import * as ReactDOM from 'react-dom'

import GPU, { TileValue } from 'cpu/GPU'

type Props = { gpu: GPU }
type State = { ctx: CanvasRenderingContext2D }
class Background extends React.Component<Props, State> {
    componentDidMount() {
        const canvas = ReactDOM.findDOMNode(this.refs.background) as HTMLCanvasElement
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
                <canvas id="background" ref="background" />
            </div>
        )
    }

    flush(gpu: GPU, ctx: CanvasRenderingContext2D) {
        const background = gpu.background1()
        const tileSet = gpu.tileSet
        const width = 32 
        const height = 32
        const tileWidth = 8
        const tileHeight = 8
        const valuesPerPixel = 4
        const rowWidth = tileWidth * width * valuesPerPixel
        const canvasData: Uint8Array = new Uint8Array(width * height * tileHeight * tileWidth * valuesPerPixel).fill(0)
        const tiles: TileValue[][][] = Array.from(background).map((byte: number) => {
            const tileIndex = Math.trunc(byte / 16)
            const tile  = tileSet[tileIndex]
            return tile
        })

        tiles.forEach((tile, tileIndex) => {
            const tileRow = Math.trunc(tileIndex / height)
            const tileColumn = tileIndex % width
            tile.forEach((row, rowIndex) => {
                const beginningOfCanvasRow = ((tileRow * tileHeight) + rowIndex) * rowWidth
                let index = beginningOfCanvasRow + (tileColumn * tileWidth * valuesPerPixel)

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

export default Background