import * as React from 'react'
import * as ReactDOM from 'react-dom'

import VisualMemoryViewer from 'components/VisualMemoryViewer'

import { default as BackgroundModel } from 'cpu/Background'
import GPU from 'cpu/GPU'
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
}
class Background extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { showTileOutlines: true, showViewportOutline: true, checkered: false, hideOutsideViewport: false }
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
                    onClick={this.props.onClick}>
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
}

export default Background