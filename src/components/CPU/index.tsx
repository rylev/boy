import * as React from 'react'

import Registers from 'cpu/Registers'
import { CPU as CPUModel } from 'cpu'
import { toHex } from 'lib/hex'
import "./cpu.css"

type Props = { cpu: CPUModel }
type State = {}
class CPU extends React.Component<Props, State> {
    register(label: string, register: number): JSX.Element {
        return <div className="reg">{label}: 0x{toHex(register)}</div>
    }

    registers(registers: Registers): JSX.Element {
        return (
            <div className="registers">
                <div className="column1">
                    {this.register("A", registers.a)}
                    {this.register("B", registers.b)}
                    {this.register("D", registers.d)}
                    {this.register("H", registers.h)}
                </div>
                <div className="column2">
                    {this.register("F", registers.f.toByte())}
                    {this.register("C", registers.c)}
                    {this.register("E", registers.e)}
                    {this.register("L", registers.l)}
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
                <div className="sp">{toHex(cpu.sp)}</div>
            </div>
        )
    }
}

export default CPU