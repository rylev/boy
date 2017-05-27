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
type State = { }
class Background extends React.Component<Props, State> {
    render() {
        return (
            <VisualMemoryViewer
                gpu={this.props.gpu}
                height={256}
                width={256}
                getData={BackgroundModel.getImageData}
                header={"Background"}
                label={"background"}
                onClick={this.props.onClick} />
        )
    }
}

export default Background