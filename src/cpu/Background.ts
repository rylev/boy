import GPU, { TileValue, BackgroundTileMap, BackgroundAndWindowDataSelect } from 'cpu/GPU'
import u8 from 'lib/u8'

export type BackgroundOptions = {
    showTileOutlines: boolean, 
    showViewportOutline: boolean,
    checkered: boolean,
    showOutsideViewport: boolean,
    highlightIndex: number
}

export namespace Background {
    export function getImageData(gpu: GPU, options: BackgroundOptions): ImageData {
        const background = gpu.background()

        const widthInTiles = 32
        const heightInTiles = 32

        const tileWidthInPixels = 8
        const tileHeightInPixels = 8

        const valuesPerPixel = 4

        const rowWidthInCanvasValues = tileWidthInPixels * widthInTiles * valuesPerPixel

        const canvasDataLength = widthInTiles * heightInTiles * tileHeightInPixels * tileWidthInPixels * valuesPerPixel
        const canvasData: Uint8Array = new Uint8Array(canvasDataLength).fill(0)
        const tiles: TileValue[][][] = Array.from(background).map(byte => gpu.tileForIndex(byte))

        tiles.forEach((tile, tileIndex) => {
            const tileRow = Math.trunc(tileIndex / heightInTiles)
            const tileColumn = tileIndex % widthInTiles

            const highlight = tileIndex === options.highlightIndex
            tile.forEach((innerRow, innerRowIndex) => {
                const pixelRowIndex = (tileRow * tileHeightInPixels) + innerRowIndex
                const beginningOfCanvasRow = pixelRowIndex * rowWidthInCanvasValues
                const beginningOfColumn = tileColumn * tileWidthInPixels
                let index = beginningOfCanvasRow + (beginningOfColumn * valuesPerPixel)

                innerRow.forEach((pixel, i) => {
                    const pixelColumnIndex = beginningOfColumn + i

                    const [rightX, xWrapsAround] = u8.overflowingAdd(gpu.scrollX, 160)
                    const [bottomY, yWrapsAround] = u8.overflowingAdd(gpu.scrollY, 144)
                    const onHorizontalBorder = gpu.scrollY === pixelRowIndex || pixelRowIndex === bottomY
                    const onVerticalBorder = gpu.scrollX === pixelColumnIndex || rightX === pixelColumnIndex
                    const betweenVerticalSides = xWrapsAround  
                        ? (pixelColumnIndex >= gpu.scrollX || pixelColumnIndex <= rightX)
                        : (pixelColumnIndex >= gpu.scrollX && pixelColumnIndex <= rightX)
                    const betweenHorizontalSides = yWrapsAround
                        ? (pixelRowIndex >= gpu.scrollY || pixelRowIndex <= bottomY)
                        : (pixelRowIndex >= gpu.scrollY && pixelRowIndex <= bottomY)

                    const onHorizontalScreenBorder = onHorizontalBorder && betweenVerticalSides
                    const onVerticalScreenBorder = onVerticalBorder && betweenHorizontalSides
                        
                    const onTileBorderX = pixelRowIndex % 8 === 0
                    const onTileBorderY = pixelColumnIndex % 8 === 0

                    const onScreenBorder = onHorizontalScreenBorder || onVerticalScreenBorder
                    const isCheckeredViewport = ((onHorizontalScreenBorder || pixelRowIndex % 2 === 0) && 
                        (onVerticalScreenBorder || pixelColumnIndex % 2 === 0)) ||
                        !options.checkered
                    const drawViewportOutline = onScreenBorder && options.showViewportOutline && isCheckeredViewport

                    const isCheckeredTileOutline = (pixelRowIndex % 2 === 0 && pixelColumnIndex % 2 === 0) || !options.checkered
                    const drawTileOutline = (onTileBorderX || onTileBorderY) && options.showTileOutlines && isCheckeredTileOutline

                    const insideViewport = betweenHorizontalSides && betweenVerticalSides
                    const drawBackground = options.showOutsideViewport || insideViewport

                    if (drawViewportOutline) {
                        canvasData[index] = 255
                        canvasData[index + 1] = 0
                        canvasData[index + 2] = 0
                    } else if (drawTileOutline) {
                        canvasData[index] = 0
                        canvasData[index + 1] = 0
                        canvasData[index + 2] = 255
                    } else if (drawBackground) {
                        const color = gpu.valueToBgColor(pixel)
                        canvasData[index] = highlight && (pixelRowIndex % 2 === 0) ? 255 : color
                        canvasData[index + 1] = highlight && pixelRowIndex % 2 === 0 ? 0 : color
                        canvasData[index + 2] = color
                    } 
                    canvasData[index + 3] = 255

                    index = index + valuesPerPixel
                })
            })
        })
        const canvasWidthInPixels = widthInTiles * tileWidthInPixels
        const canvasHeightInPixels = heightInTiles * tileHeightInPixels
        return new ImageData(
            Uint8ClampedArray.from(canvasData),
            canvasWidthInPixels,
            canvasHeightInPixels
        )
    }
}

export default Background