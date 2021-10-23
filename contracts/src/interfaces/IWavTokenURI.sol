// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

interface IWavTokenURI {
    function wav(bytes32 d1, bytes32 d2) external view returns (string memory);
}
