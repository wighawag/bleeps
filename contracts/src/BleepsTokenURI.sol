// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

/* solhint-disable quotes */

contract BleepsTokenURI {
    string internal constant TABLE_ENCODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    bytes internal constant FREQUENCIES =
        hex"00198d001b12001cae001e6200203100221b00242200264800288f002af8002d8600303b00331900362300395b003cc4004061004435004844004c9000511d0055f0005b0c006076006633006c460072b60079890080c300886b00908700992000a23a00abe000b61800c0ec00cc6500d88d00e56d00f3110101850110d601210f01323f0144750157c0016c310181d90198ca01b11901cada01e62302030b0221ab02421e02647e0288ea02af8002d8620303b10331940362320395b403cc4604061604435704843c04c8fc0511d4055f0005b0c306076306632906c464072b6707988b080c2c0886ad0908770991f90a23a80abe000b61860c0ec5";

    // settings for sound quality
    uint256 internal constant SAMPLE_RATE = 11000;
    uint256 internal constant BYTES_PER_SAMPLE = 1;

    // constants for ensuring enough precision when computing values
    int256 internal constant ONE = 1000000;
    int256 internal constant TWO = 2000000; // 2 * ONE;
    int256 internal constant HALF = 500000; // ONE/ 2;
    int256 internal constant ZERO7 = 700000; // (ONE * 7) / 10;
    int256 internal constant ZERO3 = 300000; // (ONE * 3) / 10;
    int256 internal constant ZERO1 = 100000; //(ONE * 1) / 10;
    int256 internal constant ZERO3125 = 312500; //( ONE * 3125) / 10000;
    int256 internal constant ZERO8750 = 875000; // (ONE * 8750) / 10000;
    int256 internal constant MINUS_ONE = -1000000; //; -ONE;
    int256 internal constant MIN_VALUE = MINUS_ONE + 1;
    int256 internal constant MAX_VALUE = ONE - 1;

    // allow to switch sign in assembly via mul(MINUS, x)
    int256 internal constant MINUS = -1;

    // sample rate: 22050 , bitsPerSample: 16bit
    // bytes internal constant metadataStart =
    //     'data:application/json,{"name":"__________________________________","description":"A_sound_fully_generated_onchain","external_url":"?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????","image":"data:image/svg+xml,<svg viewBox=\'0 0 32 16\' ><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' style=\'fill: rgb(219, 39, 119); font-size: 12px;\'>__________________________________</text></svg>","animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAA'; // missing 2 zero bytes

    // sample rate: 11000 , bitsPerSample: 16bit
    // bytes internal constant metadataStart =
    // 'data:application/json,{"name":"__________________________________","description":"A_sound_fully_generated_onchain","external_url":"?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????","image":"data:image/svg+xml,<svg viewBox=\'0 0 32 16\' ><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' style=\'fill: rgb(219, 39, 119); font-size: 12px;\'>__________________________________</text></svg>","animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEA+CoAAPBVAAACABAAZGF0YQAA'; // missing 2 zero bytes

    // sample rate: 11000 , bitsPerSample: 8bit
    bytes internal constant metadataStart =
        'data:application/json,{"name":"C#0 square","description":"A%20sound%20fully%20generated%20on-chain","external_url":"https://bleeps.eth.limo/#bleep=000000000","image":"data:image/svg+xml,<svg viewBox=\'0 0 32 16\' ><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' style=\'fill: rgb(219, 39, 119); font-size: 12px;\'>C#0 square</text></svg>","animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEA+CoAAPBVAAABAAgAZGF0YQAA'; // missing 2 zero bytes

    function wav(uint16 id) external view returns (string memory) {
        return _generateWav(id);
    }

    function _prepareBuffer(bytes memory buffer) internal pure {
        bytes memory start = metadataStart;
        uint256 len = metadataStart.length;
        uint256 src;
        uint256 dest;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            src := add(start, 0x20)
            dest := add(buffer, 0x20)
        }
        for (; len >= 32; len -= 32) {
            // solhint-disable-next-line no-inline-assembly
            assembly {
                mstore(dest, mload(src))
            }
            dest += 32;
            src += 32;
        }
        // TODO remove that step by ensuring the length is a multiple of 32 bytes
        uint256 mask = 256**(32 - len) - 1;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let srcpart := and(mload(src), not(mask))
            let destpart := and(mload(dest), mask)
            mstore(dest, or(destpart, srcpart))
        }
    }

    function _generateWav(uint16 id) internal view returns (string memory) {
        bytes memory buffer = new bytes(metadataStart.length + 500000); // + 2000000);
        _prepareBuffer(buffer);

        string memory table = TABLE_ENCODE;
        uint256 tablePtr;
        uint256 resultPtr = metadataStart.length + 32;
        assembly {
            // prepare the lookup table
            tablePtr := add(table, 1)

            // set write pointer
            resultPtr := add(buffer, resultPtr)
        }

        bytes memory freqTable = FREQUENCIES;

        // uint256 speed = 8; // TODO
        // uint256 numSamplesPerStep = numSamples / 32;

        uint256 numSamplesPlusOne = (3 * (((32 * (61 * 16 * SAMPLE_RATE)) / (7350)) + 1)) / 3; //3 * 3 * ((22050 + 3) / 3); // 8 = speed
        // console.log("numSamplesPlusOne %i", numSamplesPlusOne);
        int256 posStep = (440 * ONE) / int256(SAMPLE_RATE); // 440 = frequency
        int256 pos = 0;

        for (uint256 i = 0; i < numSamplesPlusOne; i += 3) {
            // offset = offset + (7350 * ONE) / (61 * sound.speed * this.sampleRate);
            // // TODO: offset = floor(offset + 7350 * ONE / (61 * sound.speed * this.sampleRate));
            // if (sound.loop && offset >= sound.loop.end * ONE && numLoops < (maxLoops || 3)) {
            //     lastStep = -1;
            //     offset = sound.loop.start ? sound.loop.start * ONE : 0;
            //     numLoops++;
            // } else if (offset >= 32 * ONE) {
            //     if (!(sound.loop?.end && sound.loop.end * ONE > offset)) {
            //     break;
            //     }
            // }
            // if (Math.floor(offset / ONE) > lastStep) {
            //     lastBleep = bleep;
            //     bleepSampleIndex = 0;
            //     lastStep = Math.floor(offset / ONE);
            //     bleep = sound.bleeps[lastStep];
            //     posOffset = pos;
            // }
            //     assembly {
            //         function abs(a) -> b {
            //             b := a
            //             if lt(b, 0) {
            //                 b := mul(b, MINUS)
            //             }
            //         }
            //         // floor(((Math.abs((x % ONE) * 2 - ONE) * 2 - ONE) * HALF) / ONE);
            //         function getValue(p, instrument) -> intValue {
            //             // skip first value as it pertain to the double bytes for chunksize
            //             if gt(p, 0) {
            //                 // tri
            //                 if eq(instrument, 0) {
            //                     intValue := sub(mul(smod(p, ONE), 2), ONE)
            //                     if slt(intValue, 0) {
            //                         intValue := sub(0, intValue)
            //                     }
            //                     intValue := sub(mul(intValue, 2), ONE)
            //                     intValue := sdiv(mul(intValue, HALF), ONE)
            //                 }
            //                 if eq(instrument, 1) {
            //                     // uneven_tri
            //                     let tmp := smod(p, ONE)
            //                     if slt(tmp, ZERO8750) {
            //                         intValue := sdiv(mul(tmp, 16), 7)
            //                     }
            //                     if sgt(tmp, ZERO8750) {
            //                         intValue := mul(sub(ONE, tmp), 16)
            //                     }
            //                     if eq(tmp, ZERO8750) {
            //                         intValue := mul(sub(ONE, tmp), 16)
            //                     }
            //                     intValue := sdiv(mul(sub(intValue, ONE), HALF), ONE)
            //                 }
            //                 if eq(instrument, 2) {
            //                     // saw
            //                     intValue := sdiv(mul(sub(smod(p, ONE), HALF), ZERO7), ONE)
            //                 }
            //                 if eq(instrument, 3) {
            //                     // square
            //                     let tmp := smod(p, ONE)
            //                     intValue := MINUS_ONE
            //                     if lt(tmp, HALF) {
            //                         intValue := ONE
            //                     }
            //                     intValue := sdiv(intValue, 4)
            //                 }
            //                 if eq(instrument, 4) {
            //                     // pulse
            //                     let tmp := smod(p, ONE)
            //                     intValue := MINUS_ONE
            //                     if lt(tmp, ZERO3125) {
            //                         intValue := ONE
            //                     }
            //                 }
            //                 if eq(instrument, 5) {
            //                     // tri2
            //                     intValue := mul(p, 4)
            //                     intValue := sdiv(
            //                         mul(
            //                             sub(
            //                                 sub(
            //                                     add(
            //                                         abs(sub(smod(intValue, TWO), ONE)),
            //                                         sdiv(
            //                                             sub(abs(sub(smod(sdiv(mul(intValue, HALF), ONE), TWO), ONE)), HALF),
            //                                             2
            //                                         )
            //                                     ),
            //                                     HALF
            //                                 ),
            //                                 ZERO1
            //                             ),
            //                             HALF
            //                         ),
            //                         ONE
            //                     )
            //                 }
            //                 if eq(instrument, 6) {
            //                     // TODO
            //                 }
            //                 if eq(instrument, 7) {
            //                     // detuned_tri
            //                     intValue := mul(p, 2)
            //                     intValue := add(
            //                         sub(abs(sub(smod(intValue, TWO), ONE)), HALF),
            //                         sub(
            //                             sdiv(sub(abs(sub(smod(sdiv(mul(intValue, 127), 128), TWO), ONE)), HALF), 2),
            //                             sdiv(ONE, 4)
            //                         )
            //                     )
            //                 }
            //                 // 16 bit:
            //                 // intValue := sdiv(mul(intValue, 32768), ONE)
            //                 intValue := add(sdiv(mul(intValue, 255), ONE), 128) // TODO never go negative
            //             }
            //         }
            //         let meloIndex := div(i, div(numSamplesPlusOne, 32)) // TODO numSamples
            //         // let meloIndex := div(mul(i, 32), numSamplesPlusOne) // TODO numSamples
            //         let data := d1
            //         if gt(meloIndex, 15) {
            //             data := d2
            //             meloIndex := sub(meloIndex, 16)
            //         }
            //         data := and(shr(add(16, mul(sub(15, meloIndex), 15)), data), 0x3FFF) // sub(15) is to divide the data in 2
            //         let note := and(data, 0x3F)
            //         let instr := and(shr(6, data), 0x07)
            //         // let instr := 3
            //         let vol := and(shr(9, data), 0x07)
            //         // int256 posStep = (440 * ONE) / int256(SAMPLE_RATE); // 440 = frequency
            //         // return floor(ONE * 440 * 2 ** floor((note - 33) / 12));
            //         // posStep := sdiv(mul(exp(2, sdiv(sub(note, 33), 12)), 440000000), SAMPLE_RATE)
            //         posStep := div(
            //             mul(and(shr(232, mload(add(freqTable, add(32, mul(note, 3))))), 0xFFFFFF), 10000),
            //             SAMPLE_RATE
            //         )
            //         let intValue := sdiv(mul(getValue(pos, instr), vol), 7) // getValue(pos, instr)
            //         if gt(pos, 0) {
            //             // skip first value as it pertain to the double bytes for chunksize
            //             pos := add(pos, posStep)
            //         }
            //         // 8 bits:
            //         let v := shl(16, intValue)
            //         intValue := sdiv(mul(getValue(pos, instr), vol), 7) // getValue(pos, instr)
            //         pos := add(pos, posStep)
            //         v := add(v, shl(8, intValue))
            //         intValue := sdiv(mul(getValue(pos, instr), vol), 7) // getValue(pos, instr)
            //         pos := add(pos, posStep)
            //         v := add(v, intValue)
            //         // write 4 characters
            //         mstore8(resultPtr, mload(add(tablePtr, and(shr(18, v), 0x3F))))
            //         resultPtr := add(resultPtr, 1)
            //         mstore8(resultPtr, mload(add(tablePtr, and(shr(12, v), 0x3F))))
            //         resultPtr := add(resultPtr, 1)
            //         mstore8(resultPtr, mload(add(tablePtr, and(shr(6, v), 0x3F))))
            //         resultPtr := add(resultPtr, 1)
            //         mstore8(resultPtr, mload(add(tablePtr, and(v, 0x3F))))
            //         resultPtr := add(resultPtr, 1)
            //     }
        }

        // write ends + size in buffer
        // solhint-disable-next-line no-inline-assembly
        assembly {
            mstore8(resultPtr, 0x22) // "
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, 0x7D) // }
            resultPtr := add(resultPtr, 1)
            mstore(buffer, sub(sub(resultPtr, buffer), 32))
        }

        // compute chnksize (TODO hardcode)
        uint256 filesizeMinus8 = ((numSamplesPlusOne - 1) * 2 + 44) - 8;
        uint256 chunkSize = filesizeMinus8 + 8 - 44;

        // filesize // 46 00 00
        resultPtr = metadataStart.length + 32 - 52;
        assembly {
            resultPtr := add(buffer, resultPtr)
            let v := shl(40, 0x46)
            v := add(v, shl(32, and(filesizeMinus8, 255)))
            v := add(v, shl(24, and(shr(8, filesizeMinus8), 255)))
            v := add(v, shl(16, and(shr(16, filesizeMinus8), 255)))
            v := add(v, shl(8, and(shr(24, filesizeMinus8), 255)))
            v := add(v, 0x57)
            // write 8 characters
            mstore8(resultPtr, mload(add(tablePtr, and(shr(42, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(36, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(30, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(24, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(18, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(12, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(6, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(v, 0x3F))))
        }

        // // // chunksize // 61 00 00
        resultPtr = metadataStart.length + 32 - 4;
        assembly {
            resultPtr := add(buffer, resultPtr)
            let v := shl(40, 0x61)
            v := add(v, shl(32, and(chunkSize, 255)))
            v := add(v, shl(24, and(shr(8, chunkSize), 255)))
            v := add(v, shl(16, and(shr(16, chunkSize), 255)))
            v := add(v, shl(8, and(shr(24, chunkSize), 255)))
            v := add(v, 0x57)
            // write 8 characters
            mstore8(resultPtr, mload(add(tablePtr, and(shr(42, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(36, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(30, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(24, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(18, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(12, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(6, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(v, 0x3F))))
        }
        return string(buffer);
    }
}
