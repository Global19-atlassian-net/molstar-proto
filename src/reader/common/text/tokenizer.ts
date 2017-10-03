/*
 * Copyright (c) 2017 molio contributors, licensed under MIT, See LICENSE file for more info.
 *
 * mostly from https://github.com/dsehnal/CIFTools.js
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

export interface Tokenizer {
    data: string

    position: number
    length: number

    currentLineNumber: number
    currentTokenStart: number
    currentTokenEnd: number
}

export interface Tokens {
    data: string,
    count: number,
    indices: ArrayLike<number>
}

export function Tokenizer(data: string): Tokenizer {
    return {
        data,
        position: 0,
        length: data.length,
        currentLineNumber: 1,
        currentTokenStart: 0,
        currentTokenEnd: 0
    };
}

export namespace Tokenizer {

    export function getTokenString(state: Tokenizer) {
        return state.data.substring(state.currentTokenStart, state.currentTokenEnd);
    }

    /**
     * Eat everything until a newline occurs.
     */
    export function eatLine(state: Tokenizer) {
        const { data } = state;
        while (state.position < state.length) {
            switch (data.charCodeAt(state.position)) {
                case 10: // \n
                    state.currentTokenEnd = state.position;
                    ++state.position;
                    ++state.currentLineNumber;
                    return;
                case 13: // \r
                    state.currentTokenEnd = state.position;
                    ++state.position;
                    ++state.currentLineNumber;
                    if (data.charCodeAt(state.position) === 10) {
                        ++state.position;
                    }
                    return;
                default:
                    ++state.position;
                    break;
            }
        }
        state.currentTokenEnd = state.position;
    }

    /** Sets the current token start to the current position */
    export function markStart(state: Tokenizer) {
        state.currentTokenStart = state.position;
    }

    /** Sets the current token start to current position and moves to the next line. */
    export function markLine(state: Tokenizer) {
        state.currentTokenStart = state.position;
        eatLine(state);
    }

    /** Advance the state by the given number of lines and return line starts/ends as tokens. */
    export function readLine(state: Tokenizer): string {
        markLine(state);
        return getTokenString(state);
    }

    /** Advance the state by the given number of lines and return line starts/ends as tokens. */
    export function readLines(state: Tokenizer, count: number): Tokens {
        const lineTokens = TokenBuilder.create(state, count * 2);

        for (let i = 0; i < count; i++) {
            markLine(state);
            TokenBuilder.addUnchecked(lineTokens, state.currentTokenStart, state.currentTokenEnd);
        }

        return { data: state.data, count, indices: lineTokens.indices };
    }

    /**
     * Eat everything until a whitespace/newline occurs.
     */
    export function eatValue(state: Tokenizer) {
        while (state.position < state.length) {
            switch (state.data.charCodeAt(state.position)) {
                case 9:  // \t
                case 10: // \n
                case 13: // \r
                case 32: // ' '
                    state.currentTokenEnd = state.position;
                    return;
                default:
                    ++state.position;
                    break;
            }
        }
        state.currentTokenEnd = state.position;
    }

    /**
     * Skips all the whitespace - space, tab, newline, CR
     * Handles incrementing line count.
     */
    export function skipWhitespace(state: Tokenizer): number {
        let prev = 10;
        while (state.position < state.length) {
            let c = state.data.charCodeAt(state.position);
            switch (c) {
                case 9: // '\t'
                case 32: // ' '
                    prev = c;
                    ++state.position;
                    break;
                case 10: // \n
                    // handle \r\n
                    if (prev !== 13) {
                        ++state.currentLineNumber;
                    }
                    prev = c;
                    ++state.position;
                    break;
                case 13: // \r
                    prev = c;
                    ++state.position;
                    ++state.currentLineNumber;
                    break;
                default:
                    return prev;
            }
        }
        return prev;
    }

    /** Trims spaces and tabs */
    export function trim(state: Tokenizer, start: number, end: number) {
        const { data } = state;
        let s = start, e = end - 1;

        let c = data.charCodeAt(s);
        while ((c === 9 || c === 32) && s <= e) c = data.charCodeAt(++s);
        c = data.charCodeAt(e);
        while ((c === 9 || c === 32) && e >= s) c = data.charCodeAt(--e);

        state.currentTokenStart = s;
        state.currentTokenEnd = e + 1;
        state.position = end;
    }
}

export function trimStr(data: string, start: number, end: number) {
    let s = start, e = end - 1;
    let c = data.charCodeAt(s);
    while ((c === 9 || c === 32) && s <= e) c = data.charCodeAt(++s);
    c = data.charCodeAt(e);
    while ((c === 9 || c === 32) && e >= s) c = data.charCodeAt(--e);
    return data.substring(s, e + 1);
}

export namespace TokenBuilder {
    interface Builder extends Tokens {
        offset: number,
        indices: Uint32Array,
        indicesLenMinus2: number
    }

    function resize(builder: Builder) {
        // scale the size using golden ratio, because why not.
        const newBuffer = new Uint32Array((1.61 * builder.indices.length) | 0);
        newBuffer.set(builder.indices);
        builder.indices = newBuffer;
        builder.indicesLenMinus2 = (newBuffer.length - 2) | 0;
    }

    export function add(tokens: Tokens, start: number, end: number) {
        const builder = tokens as Builder;
        if (builder.offset > builder.indicesLenMinus2) {
            resize(builder);
        }
        builder.indices[builder.offset++] = start;
        builder.indices[builder.offset++] = end;
        tokens.count++;
    }

    export function addUnchecked(tokens: Tokens, start: number, end: number) {
        (tokens as Builder).indices[(tokens as Builder).offset++] = start;
        (tokens as Builder).indices[(tokens as Builder).offset++] = end;
        tokens.count++;
    }

    export function create(tokenizer: Tokenizer, size: number): Tokens {
        return <Builder>{
            data: tokenizer.data,
            indicesLenMinus2: (size - 2) | 0,
            count: 0,
            offset: 0,
            indices: new Uint32Array(size)
        }
    }
}

export default Tokenizer