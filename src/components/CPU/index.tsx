import * as React from 'react'

import Registers from 'cpu/Registers'
import { CPU as CPUModel } from 'cpu'
import { toHex } from 'lib/hex'
import "./cpu.css"

type Props = { cpu: CPUModel, pcClicked: () => void }
type State = {}
class CPU extends React.Component<Props, State> {
    register(label: string, register: number): JSX.Element {
        if (register > 0xFF) { console.warn(`Register ${label} is over max: ${register}.`) }
        if (register < 0x00) { console.warn(`Register ${label} is under 0.`) }
        return (
            <div className="reg">
                <div className="regLabel">{label}</div>
                <div className="regValue">0x{toHex(register, 2)}</div>
            </div>
        )
    }

    pc() {
        const { cpu, pcClicked } = this.props

        return (
            <div className="pc" onClick={pcClicked}>
                <div className="pcLabel">PC</div>
                <div className="pcValue">0x{toHex(cpu.pc, 4)}</div>
            </div>
        )
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

    sp() {
        const { cpu } = this.props

        return (
            <div className="sp">
                <div className="spLabel">SP</div>
                <div className="spValue">0x{toHex(cpu.sp, 4)}</div>
            </div>
        )
    }

    render(): JSX.Element | null {
        const { cpu } = this.props
        return (
            <div className="cpu">
                {this.pc()}
                {this.registers(cpu.registers)}
                {this.sp()}
            </div>
        )
    }
}

export default CPU