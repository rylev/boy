namespace uint {
    export function asSigned(n: number): number {
        const byte = n & 0xFF
        if (byte > 127) {
            return byte - 256
        } else  {
            return byte

        }
        
    }
}

export default uint