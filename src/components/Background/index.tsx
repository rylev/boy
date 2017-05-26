import * as React from 'react'
import * as ReactDOM from 'react-dom'

import GPU, { TileValue, BackgroundTileMap } from 'cpu/GPU'
import './background.css'

type Props = { gpu: GPU, onClick: () => void }
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
        return <canvas onClick={this.props.onClick} height="256" width="256" id="background" ref="background" />
    }

    flush(gpu: GPU, ctx: CanvasRenderingContext2D) {
        if (gpu.backgroundTileMap !== BackgroundTileMap.x9800) { throw Error("We only support tilemap at 0x9800 for now")}
        const background = gpu.background1()
        const tileSet = gpu.tileSet

        const widthInTiles = 32 
        const heightInTiles = 32

        const tileWidth = 8
        const tileHeight = 8

        const valuesPerPixel = 4

        const rowWidth = tileWidth * widthInTiles * valuesPerPixel

        const canvasData: Uint8Array = new Uint8Array(widthInTiles * heightInTiles * tileHeight * tileWidth * valuesPerPixel).fill(0)
        const tiles: TileValue[][][] = Array.from(background).map((byte: number) => tileSet[byte])

        tiles.forEach((tile, tileIndex) => {
            const tileRow = Math.trunc(tileIndex / heightInTiles)
            const tileColumn = tileIndex % widthInTiles
            tile.forEach((innerRow, innerRowIndex) => {
                const pixelRow = (tileRow * tileHeight) + innerRowIndex
                const beginningOfCanvasRow = pixelRow * rowWidth
                const beginningOfColumn = tileColumn * tileWidth 
                let index = beginningOfCanvasRow + (beginningOfColumn * valuesPerPixel)

                innerRow.forEach((pixel, i) => {
                    const pixelColumn = beginningOfColumn + i
                    const onScreenBorderX = (gpu.scrollY === pixelRow || pixelRow === gpu.scrollY + 144) && 
                        (pixelColumn > gpu.scrollX && pixelColumn < gpu.scrollX + 160)
                    const onScreenBorderY = (gpu.scrollX === pixelColumn || gpu.scrollX + 160 === pixelColumn) && 
                        (pixelRow > gpu.scrollY && pixelRow < gpu.scrollY + 144)
                    if (onScreenBorderX || onScreenBorderY) {
                        canvasData[index] = 255
                        canvasData[index + 1] = 0
                        canvasData[index + 2] = 0
                    } else {
                        const color = gpu.valueToColor(pixel)
                        canvasData[index] = color
                        canvasData[index + 1] = color
                        canvasData[index + 2] = color
                    }
                    canvasData[index + 3] = 255
                    
                    index = index + valuesPerPixel
                })
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

export default Background