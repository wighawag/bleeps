// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

interface ITokenURI {
    function tokenURI(uint256 id) external view returns (string memory);

    function contractURI() external view returns (string memory);
}
