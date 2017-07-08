import * as React from 'react'
import * as ReactDOM from 'react-dom'

import GPU from 'cpu/GPU'
import './visualMemoryViewer.css'

type Offset = { x: number, y: number }

type Props = { 
    gpu: GPU, 
    height: number,
    width: number,
    label: string, 
    header: string, 
    getData: (gpu: GPU) => ImageData, 
    onMouseMove: (offset: Offset) => void,
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
        const canvas = this.getCanvasElement()
        if (canvas === null) { return }
        const ctx = canvas.getContext('2d') || undefined
        this.setState({ctx})

        return ctx
    }

    getCanvasElement(): HTMLCanvasElement | null {
        return ReactDOM.findDOMNode(this.refs[this.props.label]) as HTMLCanvasElement | null
    }

    canvas () {
        return <canvas 
            height={this.props.height}
            width={this.props.width}
            id={this.props.label}
            ref={this.props.label}
            onClick={this.props.onClick} 
            onMouseMove={this.onMouseMove}
            />
    }

    content () {
        if (!this.state.isShowing) { return null }
        return (
            <div>
                {this.canvas()}
                {this.props.children}
            </div>
        )
    }

    render() {
        return (
            <div className="visualMemoryViewer">
                <div className="header" onClick={this.toggleVisibility}>
                    <div>{this.props.header}</div> 
                    <div className={`directionArrow ${this.state.isShowing ? "open" : "closed"}`}>▼</div>
                </div>
                {this.content()}
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

    onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = this.getCanvasElement() 
        if (canvas === null) { return }
        const boundingRect = canvas.getBoundingClientRect()
        this.props.onMouseMove({x: e.clientX - boundingRect.left, y: e.clientY - boundingRect.top})
    }
}

export default VisualMemoryViewer
