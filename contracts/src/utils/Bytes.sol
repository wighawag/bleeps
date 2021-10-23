// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* solhint-disable no-inline-assembly */

library Bytes {
    // function append(
    //     bytes memory dest,
    //     uint256 offset,
    //     uint24 data
    // ) private {
    //     offset += 32;
    //     assembly {
    //         mstore(add(dest, offset), shl(232, data))
    //     }
    // }

    function append(
        bytes memory dest,
        uint256 offset,
        uint256 data,
        uint256 len
    ) private returns (uint256 newOffset) {
        newOffset = offset + len;
        len = 256 - len * 8;
        offset += 32;
        assembly {
            mstore(add(dest, offset), shl(len, data))
        }
        return newOffset;
    }

    function appendBase64(
        bytes memory dest,
        uint256 offset,
        uint256 data,
        uint256 len
    ) private returns (uint256 newOffset) {
        newOffset = offset + (len * 4) / 3;
        len = 256 - len * 8;
        offset += 32;
        /// TODO
        ///
        assembly {
            mstore(add(dest, offset), shl(len, data))
        }
        return newOffset;
    }

    // from https://gist.github.com/ageyev/779797061490f5be64fb02e978feb6ac
    function memcpy(
        uint256 dest,
        uint256 src,
        uint256 len
    ) private {
        for (; len >= 32; len -= 32) {
            assembly {
                mstore(dest, mload(src))
            }
            dest += 32;
            src += 32;
        }
        uint256 mask = 256**(32 - len) - 1;
        assembly {
            let srcpart := and(mload(src), not(mask))
            let destpart := and(mload(dest), mask)
            mstore(dest, or(destpart, srcpart))
        }
    }

    string internal constant TABLE_ENCODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    bytes internal constant TABLE_DECODE =
        hex"0000000000000000000000000000000000000000000000000000000000000000"
        hex"00000000000000000000003e0000003f3435363738393a3b3c3d000000000000"
        hex"00000102030405060708090a0b0c0d0e0f101112131415161718190000000000"
        hex"001a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132330000000000";

    function write(
        string memory table,
        bytes memory buffer,
        uint256 offset,
        uint256 bytePos,
        bytes1 value,
        uint24 accValue,
        bool end
    ) internal pure returns (uint24 newAccValue) {
        uint8 c = uint8(bytePos % 3);
        if (c == 0) {
            newAccValue = uint24(uint8(value)) << 16;
        } else if (c == 1) {
            newAccValue = accValue + (uint24(uint8(value)) << 8);
        }

        if (end && c != 2) {
            c = 2;
            accValue = newAccValue;
            value = 0;
        }

        if (c == 2) {
            newAccValue = 0;
            uint24 v = accValue + uint24(uint8(value));
            uint256 b = offset + ((bytePos - c) * 4) / 3;
            uint256 tablePtr;
            uint256 resultPtr;
            assembly {
                // prepare the lookup table
                tablePtr := add(table, 1)

                // result ptr, jump over length
                resultPtr := add(buffer, add(32, b))

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
    }
}
