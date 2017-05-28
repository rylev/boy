import GPU from 'cpu/GPU'

export namespace TileSet {
    export function getImageData(gpu: GPU): ImageData {
        const tileSet = gpu.tileSet

        const valuesPerPixel = 4
        const tileWidth = 8
        const tileHeight = 8

        const widthInTiles = 24 
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
        return new ImageData(
            Uint8ClampedArray.from(canvasData),
            canvasWidth,
            canvasHeight
        )
    }
}

export default TileSet