import * as React from 'react'
import * as ReactDOM from 'react-dom'

import GPU from 'cpu/GPU'
import './visualMemoryViewer.css'

type Props = { 
    gpu: GPU, 
    height: number,
    width: number,
    label: string, 
    header: string, 
    getData: (gpu: GPU) => ImageData, 
    onClick: () => void
}
type State = { ctx?: CanvasRenderingContext2D, isShowing: boolean }

class VisualMemoryViewer extends React.Component<Props, State> {
    constructor (props: Props) {
        super(props)
        this.state = { isShowing: false }
    }

    componentDidMount() {
        const data = this.props.getData(this.props.gpu)
        this.drawCanvas(data)
    }

    componentWillReceiveProps(newProps: Props) {
        const data = newProps.getData(newProps.gpu)
        this.drawCanvas(data)
    }

    drawCanvas(data: ImageData) {
        const ctx = this.getCtx()
        if (!ctx) { return }
        ctx.putImageData(data, 0, 0)
    }

    getCtx() {
        const canvas = ReactDOM.findDOMNode(this.refs[this.props.label]) as HTMLCanvasElement | null
        if (canvas === null) { return }
        const ctx = canvas.getContext('2d') || undefined
        this.setState({ctx})

        return ctx
    }

    canvas () {
        if (!this.state.isShowing) { return null }
        return <canvas 
            height={this.props.height}
            width={this.props.width}
            id={this.props.label}
            ref={this.props.label}
            onClick={this.props.onClick} />
    }

    render() {
        return (
            <div className="visualMemoryViewer">
                <div className="header" onClick={this.toggleVisibility}>
                    <div>{this.props.header}</div> 
                    <div>▼</div>
                </div>
                {this.canvas()}
            </div>
        )
    }

    toggleVisibility = () => {
        this.setState({isShowing: !this.state.isShowing}, () => {
            if (this.state.isShowing) {
                const data = this.props.getData(this.props.gpu)
                this.drawCanvas(data)
            }
        })
    }
}

export default VisualMemoryViewer
