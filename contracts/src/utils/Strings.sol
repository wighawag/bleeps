// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

library Strings {
    function uint2str(uint256 num) internal pure returns (string memory _uintAsString) {
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
            bstr[k] = bytes1(uint8(48 + (num % 10)));
            num /= 10;
            unchecked {
                k--;
            }
        }

        return string(bstr);
    }
}
