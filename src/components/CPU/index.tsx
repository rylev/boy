import * as React from 'react'
import Registers from 'cpu/Registers'
import { CPU as CPUModel } from 'cpu'
import "./cpu.css"

type Props = { cpu: CPUModel }
type State = {}
class CPU extends React.Component<Props, State> {
    registers(registers: Registers): JSX.Element {
        return (
            <div className="registers">
                <div className="column1">
                    <div className="reg">A: {registers.a}</div>
                    <div className="reg">B: {registers.b}</div>
                    <div className="reg">D: {registers.d}</div>
                    <div className="reg">H: {registers.h}</div>
                </div>
                <div className="column2">
                    <div className="reg">F: {registers.f.toByte()}</div>
                    <div className="reg">C: {registers.c}</div>
                    <div className="reg">E: {registers.e}</div>
                    <div className="reg">L: {registers.l}</div>
                </div>
            </div>
        )
    }

    render(): JSX.Element | null {
        const { cpu } = this.props
        return (
            <div className="cpu">
                <div className="pc">PC: {cpu.pc.toString(16)}</div>
                {this.registers(cpu.registers)}
                <div className="sp">{cpu.sp}</div>
            </div>
        )
    }
}

export default CPU