// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

/* solhint-disable quotes */

import "./base/ERC721Base.sol";
import "./BleepsTokenURI.sol";

contract Bleeps is ERC721Base {
    // _maintainer onoy roles is to update the tokenURI contract, useful in case there are any bug, can be revoked
    address internal _maintainer;
    BleepsTokenURI internal _tokenURIContract;

    constructor(address maintainer, BleepsTokenURI tokenURIContract) {
        _maintainer = maintainer;
        _tokenURIContract = tokenURIContract;
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
        return _tokenURIContract.wav(uint16(id));
    }

    function mint(uint16 id, address to) external payable {
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        address owner = _ownerOf(id);
        require(owner == address(0), "ALREADY_CREATED");
        _safeTransferFrom(address(0), to, id, "");
    }
}
