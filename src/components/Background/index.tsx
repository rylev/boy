import * as React from 'react'
import * as ReactDOM from 'react-dom'

import VisualMemoryViewer from 'components/VisualMemoryViewer'

import { default as BackgroundModel } from 'cpu/Background'
import GPU, { Color } from 'cpu/GPU'
import './background.css'

type Props = { 
    gpu: GPU,
    onClick: () => void // TODO: remove
}
type State = { 
    showTileOutlines: boolean 
    showViewportOutline: boolean
    checkered: boolean
    hideOutsideViewport: boolean
    backgroundIndex: number
    foo: number
}
class Background extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { 
            showTileOutlines: true, 
            showViewportOutline: true, 
            checkered: false, 
            hideOutsideViewport: false,
            backgroundIndex: 0,
            foo: 0
        }
    }

    getData = (gpu: GPU) => {
        const options = { 
            showTileOutlines: this.state.showTileOutlines, 
            showViewportOutline: this.state.showViewportOutline,
            checkered: this.state.checkered,
            showOutsideViewport: !this.state.hideOutsideViewport,
            highlightIndex: this.state.backgroundIndex
        }
        return BackgroundModel.getImageData(gpu, options)
    }

    onShowTileOutlinesChange = () => {
        this.setState({ showTileOutlines: !this.state.showTileOutlines })
    }

    onShowViewportOutline = () => {
        this.setState({ showViewportOutline: !this.state.showViewportOutline })
    }

    onCheckered = () => {
        this.setState({ checkered: !this.state.checkered })
    }

    onHideOutsideViewport = () => {
        this.setState({ hideOutsideViewport: !this.state.hideOutsideViewport })
    }

    tileDetail() {
        const backgroundIndex = this.state.backgroundIndex
        const gpu = this.props.gpu
        const tileIndex = gpu.background()[backgroundIndex]
        const tile = gpu.tileForIndex(tileIndex)
        const x = backgroundIndex % 32
        const y = Math.trunc(backgroundIndex / 32)
        const memoryLocation = gpu.backgroundTileMap + (8 * backgroundIndex)
        const tileMemoryLocation = gpu.backgroundAndWindowDataSelect + (tileIndex * 16)
        // TODO: reflect the fact that certain tiles are negative indexed

        const rows = tile.map((row, i) => {
            const pixels = row.map((pixel, j) => {
                const value = this.props.gpu.valueToBgColor(pixel)
                const style = {
                    background: `rgb(${value},${value},${value})`,
                    color: value < 100 ? 'white' : 'black'
                }

                return <div key={j} className={'pixel'} style={style}>{pixel}</div>
            })
            return <div key={i}>{pixels}</div>
        })
        return (
            <div>
                <div>Tile ({x}, {y})</div>
                <div>Background Memory Location: 0x{memoryLocation.toString(16)}</div> 
                <div>Tile Used: 0x{tileIndex.toString(16)} at 0x{tileMemoryLocation.toString(16)}</div>
                <div className="pixels">{rows}</div>
            </div>
        )
    }

    render() {
        return (
            <div>
                <VisualMemoryViewer
                    gpu={this.props.gpu}
                    height={256}
                    width={256}
                    getData={this.getData}
                    header={"Background"}
                    label={"background"}
                    onClick={this.props.onClick}
                    onMouseMove={this.onMouseMove}>
                    {this.tileDetail()}
                    <div className="toggles">
                        <div className="toggleItem">
                            <input type="checkbox" id="showTileOutlines" onChange={this.onShowTileOutlinesChange} checked={this.state.showTileOutlines} />
                            <label htmlFor="showTileOutlines">Tile Outlines</label>
                        </div>
                        <div className="toggleItem">
                            <input type="checkbox" id="showViewportOutline" onChange={this.onShowViewportOutline} checked={this.state.showViewportOutline} />
                            <label htmlFor="showViewportOutline">Viewport Outline</label>
                        </div>
                        <div className="toggleItem">
                            <input type="checkbox" id="checkered" onChange={this.onCheckered} checked={this.state.checkered} />
                            <label htmlFor="checkered">Checkered Outlines</label>
                        </div>
                        <div className="toggleItem">
                            <input type="checkbox" id="hideOutsideViewport" onChange={this.onHideOutsideViewport} checked={this.state.hideOutsideViewport} />
                            <label htmlFor="hideOutsideViewport">Hide Outside Viewport</label>
                        </div>
                    </div>
                </VisualMemoryViewer>
            </div>
        )
    }

    onMouseMove = (offset: {x: number, y: number}) => {
        const backgroundIndex = backgroundIndexFromOffset(offset)
        if (this.state.backgroundIndex !== backgroundIndex) { this.setState({ backgroundIndex })}
    }

    onClick = () => {

        this.setState({foo: this.state.backgroundIndex})

    }
}

function backgroundIndexFromOffset(offset: {x: number, y: number}): number {
    return Math.min((Math.trunc(offset.y / 8) * 32) + Math.trunc(offset.x / 8), 1023)
}

export default Background