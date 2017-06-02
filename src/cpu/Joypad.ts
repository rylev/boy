export enum Column {
    Zero,
    One
}

class Joypad {
    column: Column = Column.Zero

    start: boolean = false
    select: boolean = false
    b: boolean = false
    a: boolean = false

    down: boolean = false
    up: boolean = false
    left: boolean = false
    right: boolean = false

    toByte(): number {
        const columnBit = this.column === Column.Zero ? 1 << 5 : 1 << 4
        const rowBits = (((this.down && this.readingColumn0) || (this.start && this.readingColumn1) ? 0 : 1) << 3) |
                        (((this.up && this.readingColumn0) || (this.select && this.readingColumn1) ? 0 : 1) << 2) |
                        (((this.left && this.readingColumn0) || (this.b && this.readingColumn1) ? 0 : 1) << 1) |
                        ((this.right && this.readingColumn0) || (this.a && this.readingColumn1) ? 0 : 1) 
        return columnBit | rowBits
    }

    get readingColumn1(): boolean {
        return this.column === Column.One
    }

    get readingColumn0(): boolean {
        return this.column === Column.Zero
    }
}

export default Joypad