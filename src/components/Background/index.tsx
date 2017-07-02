import * as React from 'react'
import * as ReactDOM from 'react-dom'

import VisualMemoryViewer from 'components/VisualMemoryViewer'

import { default as BackgroundModel } from 'cpu/Background'
import GPU, { Color } from 'cpu/GPU'
import './background.css'

type Props = { 
    gpu: GPU,
    onClick: () => void
}
type State = { 
    showTileOutlines: boolean 
    showViewportOutline: boolean
    checkered: boolean
    hideOutsideViewport: boolean
    backgroundIndex: number
}
class Background extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { 
            showTileOutlines: true, 
            showViewportOutline: true, 
            checkered: false, 
            hideOutsideViewport: false,
            backgroundIndex: 0
        }
    }

    getData = (gpu: GPU) => {
        const options = { 
            showTileOutlines: this.state.showTileOutlines, 
            showViewportOutline: this.state.showViewportOutline,
            checkered: this.state.checkered,
            showOutsideViewport: !this.state.hideOutsideViewport
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
        const tileIndex = this.props.gpu.background()[this.state.backgroundIndex]
        const tile = this.props.gpu.tileForIndex(tileIndex)
        return (
            <div>
                <div>Tile {this.state.backgroundIndex} {tileIndex}</div>
                {tile.map((row,i) => {
                    const pixels = row.map((pixel,j) => {
                        const value = this.props.gpu.valueToBgColor(pixel)
                        const style = {
                            background: `rgb(${value},${value},${value})`,
                            color: value < 100 ? 'white' : 'black'
                        }

                        return <div key={j} className={'pixel'} style={style}>{pixel}</div>
                    })
                    return (
                        <div key={i}>{pixels}</div>
                    )
                })}
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
}

function backgroundIndexFromOffset(offset: {x: number, y: number}): number {
    return Math.min((Math.trunc(offset.y / 8) * 32) + Math.trunc(offset.x / 8), 1023)
}

export default Background