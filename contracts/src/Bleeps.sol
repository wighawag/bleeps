// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

/* solhint-disable quotes */

import "./base/ERC721Base.sol";
import "./utils/Strings.sol";
import "./utils/Bytes.sol";
import "base64-sol/base64.sol";
import "hardhat/console.sol";

contract Bleeps is ERC721Base {
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

    // ability to update the website url if needed
    string internal _baseExternalUrl;

    // _maintainer onoy roles is to update the tokenURI contract, useful in case there are any bug, can be revoked
    address internal _maintainer;

    struct Melody {
        bytes32 data1;
        bytes32 data2;
    }
    mapping(uint256 => Melody) internal _melodies;

    constructor(address maintainer) {
        // TODO string memory baseExternalUrl) {
        _maintainer = maintainer;
        // _baseExternalUrl = baseExternalUrl;
    }

    /// @notice A descriptive name for a collection of NFTs in this contract
    function name() external pure returns (string memory) {
        return "Bleeps, The Sound of NFT";
    }

    /// @notice An abbreviated name for NFTs in this contract
    function symbol() external pure returns (string memory) {
        return "BLEEP";
    }

    function tokenURI(uint256 id) external view returns (string memory) {
        return _tokenURI(id);
    }

    function mint(
        bytes32 data1,
        bytes32 data2,
        address to
    ) external {
        uint256 id = uint256(keccak256(abi.encodePacked(data1, data2))); // creator ?
        _melodies[id] = Melody(data1, data2);
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        address owner = _ownerOf(id);
        require(owner == address(0), "ALREADY_CREATED");
        _safeTransferFrom(address(0), to, id, "");
    }

    // -------------------------------------------------------------------------------------------------
    // INTERNAL
    // -------------------------------------------------------------------------------------------------

    // sample rate: 22050 , bitsPerSample: 16bit
    // bytes internal constant metadataStart =
    //     'data:application/json,{"name":"__________________________________","description":"A_sound_fully_generated_onchain","external_url":"?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????","image":"data:image/svg+xml,<svg viewBox=\'0 0 32 16\' ><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' style=\'fill: rgb(219, 39, 119); font-size: 12px;\'>__________________________________</text></svg>","animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAA'; // missing 2 zero bytes

    // sample rate: 11000 , bitsPerSample: 16bit
    // bytes internal constant metadataStart =
    // 'data:application/json,{"name":"__________________________________","description":"A_sound_fully_generated_onchain","external_url":"?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????","image":"data:image/svg+xml,<svg viewBox=\'0 0 32 16\' ><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' style=\'fill: rgb(219, 39, 119); font-size: 12px;\'>__________________________________</text></svg>","animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEA+CoAAPBVAAACABAAZGF0YQAA'; // missing 2 zero bytes

    // sample rate: 11000 , bitsPerSample: 8bit
    bytes internal constant metadataStart =
        'data:application/json,{"name":"__________________________________","description":"A_sound_fully_generated_onchain","external_url":"?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????","image":"data:image/svg+xml,<svg viewBox=\'0 0 32 16\' ><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' style=\'fill: rgb(219, 39, 119); font-size: 12px;\'>__________________________________</text></svg>","animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEA+CoAAPBVAAABAAgAZGF0YQAA'; // missing 2 zero bytes

    // uint256 internal constant startIndex = 580; // TODO metadataStart.length;

    function prepareBuffer(bytes memory buffer) internal pure {
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

    function _tokenURI(uint256 id) internal view returns (string memory) {
        bytes32 d1 = _melodies[id].data1;
        bytes32 d2 = _melodies[id].data2;
        return _generateWav(d1, d2);
    }

    function wav(bytes32 d1, bytes32 d2) external view returns (string memory) {
        return _generateWav(d1, d2);
    }

    function _generateWav(bytes32 d1, bytes32 d2) internal view returns (string memory) {
        bytes memory buffer = new bytes(metadataStart.length + 500000); // + 2000000);
        prepareBuffer(buffer);

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
        console.log("numSamplesPlusOne %i", numSamplesPlusOne);
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

            assembly {
                function abs(a) -> b {
                    b := a
                    if lt(b, 0) {
                        b := mul(b, MINUS)
                    }
                }
                // floor(((Math.abs((x % ONE) * 2 - ONE) * 2 - ONE) * HALF) / ONE);
                function getValue(p, instrument) -> intValue {
                    // skip first value as it pertain to the double bytes for chunksize
                    if gt(p, 0) {
                        // tri
                        if eq(instrument, 0) {
                            intValue := sub(mul(smod(p, ONE), 2), ONE)
                            if slt(intValue, 0) {
                                intValue := sub(0, intValue)
                            }
                            intValue := sub(mul(intValue, 2), ONE)
                            intValue := sdiv(mul(intValue, HALF), ONE)
                        }
                        if eq(instrument, 1) {
                            // uneven_tri
                            let tmp := smod(p, ONE)
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
                        if eq(instrument, 2) {
                            // saw
                            intValue := sdiv(mul(sub(smod(p, ONE), HALF), ZERO7), ONE)
                        }
                        if eq(instrument, 3) {
                            // square
                            let tmp := smod(p, ONE)
                            intValue := MINUS_ONE
                            if lt(tmp, HALF) {
                                intValue := ONE
                            }
                            intValue := sdiv(intValue, 4)
                        }
                        if eq(instrument, 4) {
                            // pulse
                            let tmp := smod(p, ONE)
                            intValue := MINUS_ONE
                            if lt(tmp, ZERO3125) {
                                intValue := ONE
                            }
                        }
                        if eq(instrument, 5) {
                            // tri2
                            intValue := mul(p, 4)
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
                        if eq(instrument, 6) {
                            // TODO
                        }
                        if eq(instrument, 7) {
                            // detuned_tri
                            intValue := mul(p, 2)
                            intValue := add(
                                sub(abs(sub(smod(intValue, TWO), ONE)), HALF),
                                sub(
                                    sdiv(sub(abs(sub(smod(sdiv(mul(intValue, 127), 128), TWO), ONE)), HALF), 2),
                                    sdiv(ONE, 4)
                                )
                            )
                        }

                        // 16 bit:
                        // intValue := sdiv(mul(intValue, 32768), ONE)
                        intValue := add(sdiv(mul(intValue, 255), ONE), 128) // TODO never go negative
                    }
                }
                let meloIndex := div(i, div(numSamplesPlusOne, 32)) // TODO numSamples
                // let meloIndex := div(mul(i, 32), numSamplesPlusOne) // TODO numSamples
                let data := 0x00080040018008002800c003801000480140058018006801c007802000000000
                if gt(meloIndex, 15) {
                    data := 0x0088024009802800a802c00b803000c803400d803800e803c00f804000000000
                    meloIndex := sub(meloIndex, 16)
                }
                data := and(shr(add(32, mul(sub(15, meloIndex), 14)), data), 0x3FFF)
                let note := and(data, 0x3F)

                // int256 posStep = (440 * ONE) / int256(SAMPLE_RATE); // 440 = frequency
                // return floor(ONE * 440 * 2 ** floor((note - 33) / 12));
                // posStep := sdiv(mul(exp(2, sdiv(sub(note, 33), 12)), 440000000), SAMPLE_RATE)
                posStep := div(
                    mul(and(shr(232, mload(add(freqTable, add(32, mul(note, 3))))), 0xFFFFFF), 10000),
                    SAMPLE_RATE
                )

                // posStep := sdiv(mul(meloIndex, 1000000), SAMPLE_RATE)
                //  posStep := sdiv(
                //     mul(and(shr(232, mload(add(freqTable, add(32, mul(note, 3))))), 0xFFFFFF), 4400000),
                //     SAMPLE_RATE
                // )

                // let instr := and(shr(12, data), 0x07)
                let instr := 3

                let intValue := getValue(pos, instr)
                if gt(pos, 0) {
                    // skip first value as it pertain to the double bytes for chunksize
                    pos := add(pos, posStep)
                }

                // 16 bits:
                // let v := shl(40, and(intValue, 255))
                // v := add(v, shl(32, and(shr(8, intValue), 255)))
                // intValue := getValue(pos, instr)
                // pos := add(pos, posStep)
                // v := add(v, shl(24, and(intValue, 255)))
                // v := add(v, shl(16, and(shr(8, intValue), 255)))
                // intValue := getValue(pos, instr)
                // pos := add(pos, posStep)
                // v := add(v, shl(8, and(intValue, 255)))
                // v := add(v, and(shr(8, intValue), 255))

                // // write 8 characters
                // mstore8(resultPtr, mload(add(tablePtr, and(shr(42, v), 0x3F))))
                // resultPtr := add(resultPtr, 1)
                // mstore8(resultPtr, mload(add(tablePtr, and(shr(36, v), 0x3F))))
                // resultPtr := add(resultPtr, 1)
                // mstore8(resultPtr, mload(add(tablePtr, and(shr(30, v), 0x3F))))
                // resultPtr := add(resultPtr, 1)
                // mstore8(resultPtr, mload(add(tablePtr, and(shr(24, v), 0x3F))))
                // resultPtr := add(resultPtr, 1)
                // mstore8(resultPtr, mload(add(tablePtr, and(shr(18, v), 0x3F))))
                // resultPtr := add(resultPtr, 1)
                // mstore8(resultPtr, mload(add(tablePtr, and(shr(12, v), 0x3F))))
                // resultPtr := add(resultPtr, 1)
                // mstore8(resultPtr, mload(add(tablePtr, and(shr(6, v), 0x3F))))
                // resultPtr := add(resultPtr, 1)
                // mstore8(resultPtr, mload(add(tablePtr, and(v, 0x3F))))
                // resultPtr := add(resultPtr, 1)

                // 8 bits:
                let v := shl(16, intValue)
                intValue := getValue(pos, instr)
                pos := add(pos, posStep)
                v := add(v, shl(8, intValue))
                intValue := getValue(pos, instr)
                pos := add(pos, posStep)
                v := add(v, intValue)

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

        // console.log("chunkSIze %i ", chunkSize);
        // console.log("filesizeMinus8 %i ", filesizeMinus8);
        // solhint-disable-next-line no-inline-assembly
        assembly {
            mstore8(resultPtr, 0x22) // "
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, 0x7D) // }
            resultPtr := add(resultPtr, 1)
            mstore(buffer, sub(sub(resultPtr, buffer), 32))
        }

        // console.log(buffer.length);
        // console.logUint(uint8(buffer[buffer.length - 3]));
        // console.logUint(uint8(buffer[buffer.length - 2]));
        // console.logUint(uint8(buffer[buffer.length - 1]));

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
        // buffer[startIndex - 42 + 4] = filesizeMinus8[0];
        // buffer[startIndex - 42 + 5] = filesizeMinus8[1];
        // buffer[startIndex - 42 + 6] = filesizeMinus8[2];

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
        // buffer[startIndex - 42 + 40] = chunkSize[0];
        // buffer[startIndex - 42 + 41] = chunkSize[1];
        // buffer[startIndex - 42 + 42] = chunkSize[2];

        return string(buffer);
    }

    struct Bleep {
        uint8 note;
        uint8 shape;
    }

    struct BleepInSound {
        uint8 note;
        uint8 shape;
        uint8 volume;
        uint8 sfx;
    }

    struct Sound {
        BleepInSound[32] bleeps;
        uint8 speed;
        uint8 end;
        uint8 start;
    }

    function _sound(uint256 id) internal view returns (string memory) {
        uint256 numSamples = 10 * SAMPLE_RATE;
        bytes memory buffer = new bytes(numSamples * BYTES_PER_SAMPLE + 44);

        // console.log(buffer.length);
        Sound memory sound = Sound(
            [
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0),
                BleepInSound(1, 0, 5, 0)
            ],
            32,
            0,
            0
        );
        uint256 pos = 0;
        // (uint256 newPos, Bleep memory lastBleep) = _writeSound(buffer, sound, pos);

        // if (lastBleep) {
        //     pos = newPos;
        //     uint256 bleepSampleIndex = 0;
        //     uint256 offset = 0;
        //     uint256 numSamplesFade = Math.floor(0.0166666 * this.sampleRate); // TODO share value with numSamplesTransition
        //     uint256 posOffset = 0; // TODO ?
        //     for (uint256 i = 0; i < numSamplesFade; i++) {
        //         offset = offset + (7350 * ONE) / (61 * sound.speed * SAMPLE_RATE);
        //         const {newPos, value} = this.valueFromBleep(
        //         sound,
        //         {note: lastBleep.note, shape: lastBleep.shape, volume: 0},
        //         pos,
        //         posOffset,
        //         bleepSampleIndex,
        //         numSamplesFade,
        //         offset,
        //         lastBleep
        //         );
        //         samples.push(value);
        //         bleepSampleIndex++;
        //         pos = newPos;
        //     }
        // }

        //                  R I F F-filsize-W A V E f m t _ 16------1---1---smprate-byterate
        // bytes32 header1 = 0x52494646AAAAAAAA57415645666d74201000000001000100BBBBBBBBCCCCCCCC;
        // //                 alig-bps-d a t a size----
        // bytes12 header2 = 0xDDDDEEEE64617461FFFFFFFF;
        // bytes memory header = bytes.concat(header1, header2);

        // bytes32 headerFor16bit22050rate = 0x52494646641f000057415645666d74201000000001000100401f0000401f0000;
        // bytes12 header2F = 0x0800080064617461401f0000;

        // //                            R I F F-filsize-W A V E f m t _ 16------1---1---smprate-byterate
        // bytes32 bits16rate22050_1 = 0x52494646AAAAAAAA57415645666d742010000000010001002256000044ac0000;
        // //                           alig-bps-d a t a size----
        // bytes12 bits16rate22050_2 = 0x0200100064617461BBBBBBBB;
        // bytes memory header = bytes.concat(bits16rate22050_1, bits16rate22050_2);

        // bytes4 bits16rate22050_1 = 0x52494646;
        // bytes4 bits16rate22050_2 = littleEndian32(uint32(buffer.length - 8)); // 44 is header length
        // bytes24 bits16rate22050_3 = 0x57415645666d742010000000010001002256000044ac0000;
        // bytes8 bits16rate22050_4 = 0x0200100064617461;
        // bytes4 bits16rate22050_5 = littleEndian32(uint32(buffer.length - 44));

        return string(bytes.concat("data:audio/wav;base64,", buffer));
    }

    //  function _sound(uint256 id) internal pure returns (string memory) {
    //     uint256 numSamples = 10 * SAMPLE_RATE;
    //     bytes memory buffer = new bytes(numSamples * BYTES_PER_SAMPLE);
    //     Sound memory sound = Sound(
    //         [
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0),
    //             BleepInSound(1, 0, 5, 0)
    //         ],
    //         32,
    //         0,
    //         0
    //     );
    //     uint256 pos = 0;
    //     // (uint256 newPos, Bleep memory lastBleep) = _writeSound(buffer, sound, pos);

    //     // if (lastBleep) {
    //     //     pos = newPos;
    //     //     uint256 bleepSampleIndex = 0;
    //     //     uint256 offset = 0;
    //     //     uint256 numSamplesFade = Math.floor(0.0166666 * this.sampleRate); // TODO share value with numSamplesTransition
    //     //     uint256 posOffset = 0; // TODO ?
    //     //     for (uint256 i = 0; i < numSamplesFade; i++) {
    //     //         offset = offset + (7350 * ONE) / (61 * sound.speed * SAMPLE_RATE);
    //     //         const {newPos, value} = this.valueFromBleep(
    //     //         sound,
    //     //         {note: lastBleep.note, shape: lastBleep.shape, volume: 0},
    //     //         pos,
    //     //         posOffset,
    //     //         bleepSampleIndex,
    //     //         numSamplesFade,
    //     //         offset,
    //     //         lastBleep
    //     //         );
    //     //         samples.push(value);
    //     //         bleepSampleIndex++;
    //     //         pos = newPos;
    //     //     }
    //     // }

    //     //                  R I F F-filsize-W A V E f m t _ 16------1---1---smprate-byterate
    //     // bytes32 header1 = 0x52494646AAAAAAAA57415645666d74201000000001000100BBBBBBBBCCCCCCCC;
    //     // //                 alig-bps-d a t a size----
    //     // bytes12 header2 = 0xDDDDEEEE64617461FFFFFFFF;
    //     // bytes memory header = bytes.concat(header1, header2);

    //     // bytes32 headerFor16bit22050rate = 0x52494646641f000057415645666d74201000000001000100401f0000401f0000;
    //     // bytes12 header2F = 0x0800080064617461401f0000;

    //     // //                            R I F F-filsize-W A V E f m t _ 16------1---1---smprate-byterate
    //     // bytes32 bits16rate22050_1 = 0x524946460000000057415645666d742010000000010001002256000044ac0000;
    //     // //                           alig-bps-d a t a size----
    //     // bytes12 bits16rate22050_2 = 0x020010006461746100000000;
    //     // bytes memory header = bytes.concat(bits16rate22050_1, bits16rate22050_2);

    //     bytes4 bits16rate22050_1 = 0x52494646;
    //     bytes4 bits16rate22050_2 = littleEndian32(uint32(buffer.length + 44 - 8)); // 44 is header length
    //     bytes24 bits16rate22050_3 = 0x57415645666d742010000000010001002256000044ac0000;
    //     bytes8 bits16rate22050_4 = 0x0200100064617461;
    //     bytes4 bits16rate22050_5 = littleEndian32(uint32(buffer.length));

    //     bytes memory header = bytes.concat(
    //         bits16rate22050_1,
    //         bits16rate22050_2,
    //         bits16rate22050_3,
    //         bits16rate22050_4,
    //         bits16rate22050_5
    //     );

    //     return string(abi.encodePacked("data:audio/wav;base64,", Base64.encode(abi.encodePacked(header, buffer))));
    // }

    function littleEndian32(uint32 num) internal pure returns (bytes4) {
        return
            bytes4(((num >> 24) & 0xff) | ((num << 8) & 0xff0000) | ((num >> 8) & 0xff00) | ((num << 24) & 0xff000000));
    }

    /*
    writeSound(
        samples: number[],
        sound: Sound,
        startingPos: number,
        startingSampleIndex: number,
        maxLoops?: number,
        maxNumSamples?: number
    ): {newPos: number; lastBleep?: BleepInSound; newSampleIndex: number} {
        let pos = startingPos;
        let posOffset = startingPos;
        let offset = 0;
        let lastStep = -1;
        let bleepSampleIndex = 0;
        let lastBleep: BleepInSound | undefined;
        let bleep: BleepInSound | undefined;
        let numLoops = 0;
        let sampleIndex = startingSampleIndex;
        // eslint-disable-next-line no-constant-condition
        while (!maxNumSamples || sampleIndex - startingSampleIndex < maxNumSamples) {
        offset = offset + (7350 * ONE) / (61 * sound.speed * this.sampleRate);
        // TODO: offset = floor(offset + 7350 * ONE / (61 * sound.speed * this.sampleRate));
        if (sound.loop && offset >= sound.loop.end * ONE && numLoops < (maxLoops || 3)) {
            lastStep = -1;
            offset = sound.loop.start ? sound.loop.start * ONE : 0;
            numLoops++;
        } else if (offset >= 32 * ONE) {
            if (!(sound.loop?.end && sound.loop.end * ONE > offset)) {
            break;
            }
        }

        if (Math.floor(offset / ONE) > lastStep) {
            lastBleep = bleep;
            bleepSampleIndex = 0;
            lastStep = Math.floor(offset / ONE);
            bleep = sound.bleeps[lastStep];
            posOffset = pos;
        }

        if (!bleep) {
            bleep = {note: lastBleep?.note || 0, shape: lastBleep?.shape || 0, volume: 0};
        }
        const numSamplesTransition = Math.floor(0.0033333 * this.sampleRate);

        const {newPos, value} = this.valueFromBleep(
            sound,
            bleep,
            pos,
            posOffset,
            bleepSampleIndex,
            numSamplesTransition,
            offset,
            lastBleep
        );
        if (samples.length < sampleIndex) {
            samples.push(value);
        } else {
            samples[sampleIndex] = Math.min(Math.max((samples[sampleIndex] || 0) + value, MIN_VALUE), MAX_VALUE);
        }
        sampleIndex++;
        bleepSampleIndex++;
        pos = newPos;
        }

        lastBleep = bleep;

        return {newPos: pos, lastBleep, newSampleIndex: sampleIndex};
    }
    */
    function _writeSound(bytes memory buffer) internal view returns (string memory str) {
        return "";
    }
}
