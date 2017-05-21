const MAX_U8 = 255
namespace u8 {
    export function asSigned(n: number): number {
        const byte = n & 0xFF
        if (byte > 127) {
            return byte - (MAX_U8 + 1)
        } else  {
            return byte
        }
    }

    export function wrappingAdd(n1: number, n2: number): number {
        return (n1 + n2) % (MAX_U8 + 1)
    }

    export function wrappingSub(n1: number, n2: number): number {
        const result = (n1 - n2) % (MAX_U8 + 1)
        if (result < 0) {
            return MAX_U8 + result
        } else {
            return result

        }
    }
}

export default u8