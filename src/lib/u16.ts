const MAX_U16 = 0xFFFF

export namespace u16 {
    export function wrappingAdd(n1: number, n2: number): [number, boolean] {
        const result = n1 + n2
        if (result > MAX_U16) {
            return [result >> 16, true]
        }
        return [result, false]
    }

    export function firstByte(n: number): number {
        return n & 0xFF
    }

    export function secondByte(n: number): number {
        return (n & 0xFF00) >> 8
    }
}

export default u16