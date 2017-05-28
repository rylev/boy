import * as React from 'react'
import * as ReactDOM from 'react-dom'

import GPU from 'cpu/GPU'
import './screen.css'

type Props = {
    gpu: GPU
}
type State = {
    ctx?: CanvasRenderingContext2D
}

class Screen extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {}
    }
    
    componentDidMount() {
        const { gpu } = this.props
        gpu.onDraw = this.drawCanvas
        gpu.draw()
    }

    componentWillUnmount() {
        this.setState({ctx: undefined})
    }

    componentWillReceiveProps(newProps: Props) {
        const { gpu } = newProps
        gpu.onDraw = this.drawCanvas
        gpu.draw()
    }

    drawCanvas = (data: ImageData) => {
        const ctx = this.getCtx()
        if (!ctx) { return }
        ctx.putImageData(data, 0, 0)
    }

    getCtx() {
        const { ctx } = this.state
        if (ctx) { return ctx } 
        const canvas = ReactDOM.findDOMNode(this.refs.screen) as HTMLCanvasElement | null
        if (canvas === null) { return undefined }
        const newCtx = canvas.getContext('2d') || undefined

        this.setState({ctx: newCtx})

        return newCtx
    }

    canvas () {
        return <canvas 
            height={144}
            width={160}
            id="screen"
            ref="screen" />
    }

    render() {
        return (
            <div className="screen">
                {this.canvas()}
            </div>
        )
    }
}

export default Screen