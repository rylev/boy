import * as React from 'react'
import * as ReactDOM from 'react-dom'

import VisualMemoryViewer from 'components/VisualMemoryViewer'

import { default as TileSetModel } from 'cpu/TileSet'
import GPU from 'cpu/GPU'
import './tileSet.css'

type Props = { 
    gpu: GPU,
    onClick: () => void
}
type State = { }
class TileSet extends React.Component<Props, State> {
    render() {
        return (
            <VisualMemoryViewer
                gpu={this.props.gpu}
                height={384}
                width={64}
                getData={TileSetModel.getImageData}
                header={"TileSet"}
                label={"tileSet"}
                onClick={() => { }} />
        )
    }
}

export default TileSet