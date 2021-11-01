// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "../base/ERC721BaseWithPermit.sol";

contract MandalaTokenMock is ERC721BaseWithPermit {
    /// @notice A descriptive name for a collection of NFTs in this contract
    function name() public pure override returns (string memory) {
        return "MandalaMock";
    }

    /// @notice An abbreviated name for NFTs in this contract
    function symbol() external pure returns (string memory) {
        return "MandalaMock";
    }

    function mint(uint16 id, address to) external {
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        address owner = _ownerOf(id);
        require(owner == address(0), "ALREADY_CREATED");
        _safeTransferFrom(address(0), to, id, "");
    }
}
