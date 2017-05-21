const MAX_U16 = 0xFFFF

export namespace u16 {
    export function overflowingAdd(n1: number, n2: number): [number, boolean] {
        const result = n1 + n2
        if (result > MAX_U16) {
            return [result >> 16, true]
        }
        return [result, false]
    }
    export function wrappingAdd(n1: number, n2: number): number {
        const [result, overflow] = overflowingAdd(n1, n2)
        return result
    }

    export function lsb(n: number): number {
        return n & 0xFF
    }

    export function msb(n: number): number {
        return (n & 0xFF00) >> 8
    }
}

export default u16