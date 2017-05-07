const MAX_U16 = 0xFFFF
function u16WrappingAdd(n1: number, n2: number): [number, boolean] {
    const result = n1 + n2
    if (result > MAX_U16) {
        return [result >> 16, true]
    }
    return [result, false]
}