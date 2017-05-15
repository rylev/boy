import * as React from 'react'
import Registers from 'cpu/Registers'
import { CPU as CPUModel } from 'cpu'

type Props = { cpu: CPUModel }
type State = {}
class CPU extends React.Component<Props, State> {
    registers(registers: Registers): JSX.Element | null {
        return (
            <div>
                <div>
                    <span>A: {registers.a}</span>
                    <span>B: {registers.b}</span>
                    <span>C: {registers.c}</span>
                    <span>D: {registers.d}</span>
                </div>
                <div>
                    <span>E: {registers.e} </span>
                    <span>H: {registers.h} </span>
                    <span>L: {registers.l} </span>
                </div>
            </div>
        )
    }

    render(): JSX.Element | null {
        const { cpu } = this.props
        return (
            <div>
                <div>PC: {cpu.pc.toString(16)}</div>
                {this.registers(cpu.registers)}
            </div>
        )
    }
}

export default CPU