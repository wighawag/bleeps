// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "./ITokenURI.sol";

/* solhint-disable quotes */

contract BleepsTokenURI is ITokenURI {
    string internal constant TABLE_ENCODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    bytes internal constant FREQUENCIES =
        hex"00198d001b12001cae001e6200203100221b00242200264800288f002af8002d8600303b00331900362300395b003cc4004061004435004844004c9000511d0055f0005b0c006076006633006c460072b60079890080c300886b00908700992000a23a00abe000b61800c0ec00cc6500d88d00e56d00f3110101850110d601210f01323f0144750157c0016c310181d90198ca01b11901cada01e62302030b0221ab02421e02647e0288ea02af8002d8620303b10331940362320395b403cc4604061604435704843c04c8fc0511d4055f0005b0c306076306632906c464072b6707988b080c2c0886ad0908770991f90a23a80abe000b61860c0ec5";

    string internal constant noteNames = "C C#D D#E F F#G G#A A#B ";
    // string internal constant instrumentNames = "TRIANGLE TILTED SAW  SAW SQUARE PULSE ORGAN NOISE PHASER";

    // settings for sound quality
    uint256 internal constant SAMPLE_RATE = 11000;
    uint256 internal constant BYTES_PER_SAMPLE = 1;

    // constants for ensuring enough precision when computing values
    int256 internal constant ONE = 1000000;
    int256 internal constant HUNDRED = 100000000;
    int256 internal constant TWO = 2000000; // 2 * ONE;
    int256 internal constant FOUR = 4000000;
    int256 internal constant HALF = 500000; // ONE/ 2;
    int256 internal constant ZERO7 = 700000; // (ONE * 7) / 10;
    int256 internal constant ZERO3 = 300000; // (ONE * 3) / 10;
    int256 internal constant ZERO1 = 100000; //(ONE * 1) / 10;
    int256 internal constant ZERO3125 = 312500; //( ONE * 3125) / 10000;
    int256 internal constant ZERO8750 = 875000; // (ONE * 8750) / 10000;
    int256 internal constant MINUS_ONE = -1000000; //; -ONE;
    int256 internal constant MIN_VALUE = MINUS_ONE + 1;
    int256 internal constant MAX_VALUE = ONE - 1;

    // svg from : https://codepen.io/rachelmcgrane/pen/VexWdX
    function contractURI() external pure returns (string memory) {
        return
            'data:application/json,{"name":"Bleeps","description":"Composable%20Sounds%20Fully%20Generated%20On-Chain","image":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCAzOC4wNSIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6d2hpdGUiID48c3R5bGU+I0xpbmVfMSB7YW5pbWF0aW9uOnB1bHNlIDFzIGluZmluaXRlO2FuaW1hdGlvbi1kZWxheTouMTVzO30jTGluZV8yIHthbmltYXRpb246cHVsc2UgMXMgaW5maW5pdGU7YW5pbWF0aW9uLWRlbGF5Oi4zMHM7fSNMaW5lXzMge2FuaW1hdGlvbjpwdWxzZSAxcyBpbmZpbml0ZTthbmltYXRpb24tZGVsYXk6LjQ1czt9I0xpbmVfNCB7YW5pbWF0aW9uOnB1bHNlIDFzIGluZmluaXRlO2FuaW1hdGlvbi1kZWxheTouNjBzO30jTGluZV81IHthbmltYXRpb246cHVsc2UgMXMgaW5maW5pdGU7YW5pbWF0aW9uLWRlbGF5Oi43NXM7fSNMaW5lXzYge2FuaW1hdGlvbjpwdWxzZSAxcyBpbmZpbml0ZTthbmltYXRpb24tZGVsYXk6Ljkwczt9I0xpbmVfNyB7YW5pbWF0aW9uOnB1bHNlIDFzIGluZmluaXRlO2FuaW1hdGlvbi1kZWxheToxLjA1czt9I0xpbmVfOCB7YW5pbWF0aW9uOnB1bHNlIDFzIGluZmluaXRlO2FuaW1hdGlvbi1kZWxheToxLjIwczt9I0xpbmVfOSB7YW5pbWF0aW9uOnB1bHNlIDFzIGluZmluaXRlO2FuaW1hdGlvbi1kZWxheToxLjM1czt9QGtleWZyYW1lcyBwdWxzZSB7MCV7dHJhbnNmb3JtOiBzY2FsZVkoMSk7dHJhbnNmb3JtLW9yaWdpbjo1MCUgNTAlO301MCUge3RyYW5zZm9ybTogc2NhbGVZKC43KTt0cmFuc2Zvcm0tb3JpZ2luOiA1MCUgNTAlO30xMDAlIHt0cmFuc2Zvcm06IHNjYWxlWSgxKTt0cmFuc2Zvcm0tb3JpZ2luOiA1MCUgNTAlO319PC9zdHlsZT48cGF0aCBpZD0iTGluZV8xIiBkYXRhLW5hbWU9IkxpbmUgMSIgZD0iTTAuOTEsMTVMMC43OCwxNUExLDEsMCwwLDAsMCwxNnY2YTEsMSwwLDEsMCwyLDBzMCwwLDAsMFYxNmExLDEsMCwwLDAtMS0xSDAuOTFaIi8+PHBhdGggaWQ9IkxpbmVfMiIgZGF0YS1uYW1lPSJMaW5lIDIiIGQ9Ik02LjkxLDlMNi43OCw5QTEsMSwwLDAsMCw2LDEwVjI4YTEsMSwwLDEsMCwyLDBzMCwwLDAsMFYxMEExLDEsMCwwLDAsNyw5SDYuOTFaIi8+PHBhdGggaWQ9IkxpbmVfMyIgZGF0YS1uYW1lPSJMaW5lIDMiIGQ9Ik0xMi45MSwwTDEyLjc4LDBBMSwxLDAsMCwwLDEyLDFWMzdhMSwxLDAsMSwwLDIsMHMwLDAsMCwwVjFhMSwxLDAsMCwwLTEtMUgxMi45MVoiLz48cGF0aCBpZD0iTGluZV80IiBkYXRhLW5hbWU9IkxpbmUgNCIgZD0iTTE4LjkxLDEwbC0wLjEyLDBBMSwxLDAsMCwwLDE4LDExVjI3YTEsMSwwLDEsMCwyLDBzMCwwLDAsMFYxMWExLDEsMCwwLDAtMS0xSDE4LjkxWiIvPjxwYXRoIGlkPSJMaW5lXzUiIGRhdGEtbmFtZT0iTGluZSA1IiBkPSJNMjQuOTEsMTVsLTAuMTIsMEExLDEsMCwwLDAsMjQsMTZ2NmExLDEsMCwwLDAsMiwwczAsMCwwLDBWMTZhMSwxLDAsMCwwLTEtMUgyNC45MVoiLz48cGF0aCBpZD0iTGluZV82IiBkYXRhLW5hbWU9IkxpbmUgNiIgZD0iTTMwLjkxLDEwbC0wLjEyLDBBMSwxLDAsMCwwLDMwLDExVjI3YTEsMSwwLDEsMCwyLDBzMCwwLDAsMFYxMWExLDEsMCwwLDAtMS0xSDMwLjkxWiIvPjxwYXRoIGlkPSJMaW5lXzciIGRhdGEtbmFtZT0iTGluZSA3IiBkPSJNMzYuOTEsMEwzNi43OCwwQTEsMSwwLDAsMCwzNiwxVjM3YTEsMSwwLDEsMCwyLDBzMCwwLDAsMFYxYTEsMSwwLDAsMC0xLTFIMzYuOTFaIi8+PHBhdGggaWQ9IkxpbmVfOCIgZGF0YS1uYW1lPSJMaW5lIDgiIGQ9Ik00Mi45MSw5TDQyLjc4LDlBMSwxLDAsMCwwLDQyLDEwVjI4YTEsMSwwLDEsMCwyLDBzMCwwLDAsMFYxMGExLDEsMCwwLDAtMS0xSDQyLjkxWiIvPjxwYXRoIGlkPSJMaW5lXzkiIGRhdGEtbmFtZT0iTGluZSA5IiBkPSJNNDguOTEsMTVsLTAuMTIsMEExLDEsMCwwLDAsNDgsMTZ2NmExLDEsMCwxLDAsMiwwczAsMCwwLDBWMTZhMSwxLDAsMCwwLTEtMUg0OC45MVoiLz48L3N2Zz4K","external_link":"https://bleeps.art"}';
    }

    function tokenURI(uint256 id) external pure returns (string memory) {
        return _generateWav(id);
    }

    function uint2str(uint256 num) private pure returns (string memory _uintAsString) {
        unchecked {
            if (num == 0) {
                return "0";
            }

            uint256 j = num;
            uint256 len;
            while (j != 0) {
                len++;
                j /= 10;
            }

            bytes memory bstr = new bytes(len);
            uint256 k = len - 1;
            while (num != 0) {
                bstr[k--] = bytes1(uint8(48 + (num % 10)));
                num /= 10;
            }

            return string(bstr);
        }
    }

    // solhint-disable-next-line code-complexity
    function instrumentName(uint256 id, bool doubleEncoding) internal pure returns (bytes memory str) {
        uint256 instr = (uint256(id) >> 6) % 16;
        if (instr == 0) {
            str = "TRIANGLE";
        } else if (instr == 1) {
            str = doubleEncoding ? bytes("TILTED%2520SAW") : bytes("TILTED%20SAW");
        } else if (instr == 2) {
            str = "SAW";
        } else if (instr == 3) {
            str = "SQUARE";
        } else if (instr == 4) {
            str = "PULSE";
        } else if (instr == 5) {
            str = "ORGAN";
        } else if (instr == 6) {
            str = "NOISE";
        } else if (instr == 7) {
            str = "PHASER";
        } else if (instr == 8) {
            str = "FUNKY_SAW";
        }
    }

    // solhint-disable-next-line code-complexity
    function noteString(uint256 id, bool doubleEncoding) internal pure returns (bytes memory str) {
        uint256 note = uint256(id) % 64;
        uint8 m = uint8(note % 12);
        uint8 n = m;
        if (m > 0) {
            n--;
        }
        if (m > 2) {
            n--;
        }
        if (m > 5) {
            n--;
        }
        if (m > 7) {
            n--;
        }
        if (m > 9) {
            n--;
        }
        bytes1 noteStr = bytes1(uint8(65) + uint8((n + 2) % 7));
        bytes1 octaveStr = bytes1(50 + uint8(note / 12)); // 48 + 2 = ascii code for "2" the smallest octave available here, A4 being 440Hz

        if (m == 1 || m == 3 || m == 6 || m == 8 || m == 10) {
            if (doubleEncoding) {
                return bytes.concat(noteStr, "%2523", octaveStr);
            } else {
                return bytes.concat(noteStr, "%23", octaveStr);
            }
        } else {
            return bytes.concat(noteStr, octaveStr);
        }

        // str = "_";
        // str[0] = bytes1(uint8(65) + uint8((n + 2) % 7));
        // if (m == 1 || m == 3 || m == 6 || m == 8 || m == 10) {
        //     if (doubleEncoding) {
        //         str = bytes.concat(str, "%2523_");
        //     } else {
        //         str = bytes.concat(str, "%23_");
        //     }
        // } else {
        //     str = bytes.concat(str, "_");
        // }
        // str[str.length - 1] = bytes1(48 + uint8(note / 12));
    }

    function _prepareBuffer(uint256 id, bytes memory buffer) internal pure returns (uint256) {
        unchecked {
            bytes memory instrument = instrumentName(id, false);
            bytes memory note = noteString(id, false);
            bytes memory start = bytes.concat(
                'data:application/json,{"name":"',
                instrument,
                "%20",
                note,
                '","description":"A%20sound%20fully%20generated%20onchain","external_url":"',
                "https://bleeps.art/bleeps/%23id=",
                bytes(uint2str(id)),
                "\",\"image\":\"data:image/svg+xml,<svg%2520xmlns='http://www.w3.org/2000/svg'%2520viewBox='0%25200%252096%252048'%2520><text%2520x='48'%2520y='24'%2520dominant-baseline='middle'%2520text-anchor='middle'%2520style='fill:%2520rgb(84,%2520102,%2520221);%2520font-size:%252012px;'>",
                instrumentName(id, true),
                "%20",
                noteString(id, true),
                '</text></svg>",',
                '"attributes":[{"trait_type":"Instrument","value":"',
                instrument,
                '"},{"trait_type":"Note","value":"',
                note,
                '"}],',
                '"animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEA+CoAAPBVAAABAAgAZGF0YQAA'
            ); // missing 2 zero bytes
            uint256 len = start.length;
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
            return start.length;
        }
    }

    function _finishBuffer(
        bytes memory buffer,
        uint256 resultPtr,
        uint256 tablePtr,
        uint256 numSamplesPlusOne,
        uint256 startLength
    ) internal pure {
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
        resultPtr = startLength + 32 - 52;
        // solhint-disable-next-line no-inline-assembly
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
        resultPtr = startLength + 32 - 4;
        // solhint-disable-next-line no-inline-assembly
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
    }

    function _generateWav(uint256 id) internal pure returns (string memory) {
        bytes memory buffer = new bytes(100000);
        uint256 startLength = _prepareBuffer(id, buffer);

        uint256 note = uint256(id) % 64;
        uint256 instr = (uint256(id) >> 6) % 16;

        uint256 vol = 500;

        string memory table = TABLE_ENCODE;
        uint256 tablePtr;
        uint256 resultPtr = startLength + 32;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            // prepare the lookup table
            tablePtr := add(table, 1)

            // set write pointer
            resultPtr := add(buffer, resultPtr)
        }

        bytes memory freqTable = FREQUENCIES;

        // uint256 numSamplesPlusOne = 1461; //(3 * ((((61 * 16 * SAMPLE_RATE)) / (7350)) + 1)) / 3; //3 * 3 * ((22050 + 3) / 3); // 8 = speed
        // console.log("numSamplesPlusOne %i", numSamplesPlusOne);

        int256 pos = 0;

        uint256[] memory noise_handler = new uint256[](4);

        vol = 0;
        for (uint256 i = 0; i < 8766 + 3000; i += 3) {
            if (i > 8766) {
                if ((vol > 0)) {
                    vol -= 1;
                }
            } else if (i % 2 == 0) {
                if (vol < 500) {
                    vol += 1;
                }
            }

            // solhint-disable-next-line no-inline-assembly
            assembly {
                function abs(a) -> b {
                    b := a
                    if slt(b, 0) {
                        b := sub(0, b)
                    }
                }

                let posStep := div(
                    mul(and(shr(232, mload(add(freqTable, add(32, mul(note, 3))))), 0xFFFFFF), 10000),
                    SAMPLE_RATE
                )

                let v := 0
                for {
                    let c := 0
                } lt(c, 3) {
                    c := add(c, 1)
                } {
                    let intValue := 0
                    // skip first value as it pertain to the double bytes for chunksize
                    if gt(pos, 0) {
                        // tri
                        if eq(instr, 0) {
                            // triangle

                            intValue := abs(sub(mul(mod(pos, ONE), 2), ONE))
                            intValue := sub(mul(intValue, 2), ONE)
                            intValue := sdiv(intValue, 2)
                        }
                        if eq(instr, 1) {
                            // tilted saw (uneven_tri)
                            let tmp := smod(pos, ONE)
                            if slt(tmp, ZERO8750) {
                                intValue := sdiv(mul(tmp, 16), 7)
                            }
                            if sgt(tmp, ZERO8750) {
                                intValue := mul(sub(ONE, tmp), 16)
                            }
                            if eq(tmp, ZERO8750) {
                                intValue := mul(sub(ONE, tmp), 16)
                            }
                            intValue := sdiv(mul(sub(intValue, ONE), HALF), ONE)
                        }
                        if eq(instr, 2) {
                            // saw
                            intValue := sdiv(mul(sub(smod(pos, ONE), HALF), ZERO7), ONE)
                        }
                        if eq(instr, 3) {
                            // square
                            let tmp := smod(pos, ONE)
                            intValue := MINUS_ONE
                            if lt(tmp, HALF) {
                                intValue := ONE
                            }
                            intValue := sdiv(intValue, 4)
                        }
                        if eq(instr, 4) {
                            // pulse
                            let tmp := smod(pos, ONE)
                            intValue := MINUS_ONE
                            if lt(tmp, ZERO3125) {
                                intValue := ONE
                            }
                            intValue := sdiv(intValue, 4)
                        }
                        if eq(instr, 5) {
                            // organ (tri2)
                            intValue := mul(pos, 4)
                            intValue := sdiv(
                                mul(
                                    sub(
                                        sub(
                                            add(
                                                abs(sub(smod(intValue, TWO), ONE)),
                                                sdiv(
                                                    sub(abs(sub(smod(sdiv(mul(intValue, HALF), ONE), TWO), ONE)), HALF),
                                                    2
                                                )
                                            ),
                                            HALF
                                        ),
                                        ZERO1
                                    ),
                                    HALF
                                ),
                                ONE
                            )
                        }
                        if eq(instr, 6) {
                            // noise
                            let rand := mload(add(noise_handler, 32))
                            let lastx := mload(add(noise_handler, 64))
                            let sample := mload(add(noise_handler, 96))
                            let lsample := mload(add(noise_handler, 128))
                            rand := mod(add(mul(1103515245, rand), 12345), 0x80000000)
                            let scale := div(mul(sub(pos, lastx), FOUR), 160000)
                            lsample := sample
                            sample := sdiv(
                                mul(add(lsample, scale), sub(div(mul(rand, TWO), 0x80000000), ONE)),
                                add(ONE, scale)
                            )
                            lastx := pos
                            intValue := sdiv(
                                mul(sdiv(mul(add(lsample, sample), 4), 3), sub(175, mul(scale, 100))),
                                HUNDRED
                            )
                            if slt(intValue, MINUS_ONE) {
                                intValue := MINUS_ONE
                            }
                            if sgt(intValue, ONE) {
                                intValue := ONE
                            }
                            intValue := sdiv(mul(intValue, 5), 10)
                            mstore(add(noise_handler, 32), rand)
                            mstore(add(noise_handler, 64), lastx)
                            mstore(add(noise_handler, 96), sample)
                            mstore(add(noise_handler, 128), lsample)
                        }

                        if eq(instr, 7) {
                            // phaser (detuned_tri)
                            intValue := mul(pos, 2)
                            intValue := add(
                                sub(abs(sub(smod(intValue, TWO), ONE)), HALF),
                                sub(
                                    sdiv(sub(abs(sub(smod(sdiv(mul(intValue, 127), 128), TWO), ONE)), HALF), 2),
                                    sdiv(ONE, 4)
                                )
                            )
                        }
                        if eq(instr, 8) {
                            intValue := mul(pos, 2)
                            intValue := sdiv(
                                mul(
                                    add(
                                        sub(sub(smod(intValue, TWO), ONE), HALF),
                                        sub(
                                            sdiv(sub(sub(smod(sdiv(mul(intValue, 127), 128), TWO), ONE), HALF), 2),
                                            sdiv(ONE, 4)
                                        )
                                    ),
                                    5
                                ),
                                7
                            )
                        }
                        intValue := sdiv(mul(intValue, vol), 700)
                        intValue := add(sdiv(mul(intValue, 256), TWO), 128)
                    }
                    v := add(v, shl(sub(16, mul(c, 8)), intValue))
                    pos := add(pos, posStep)
                }

                // write 4 characters
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, v), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, v), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, v), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(v, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }
        }

        _finishBuffer(buffer, resultPtr, tablePtr, 8766 + 3000, startLength);

        return string(buffer);
    }
}
