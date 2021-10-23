// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

/* solhint-disable quotes */

import "./base/ERC721Base.sol";
import "./interfaces/IWavTokenURI.sol";

contract MeloBleeps is ERC721Base {
    // _maintainer onoy roles is to update the tokenURI contract, useful in case there are any bug, can be revoked
    address internal _maintainer;
    IWavTokenURI internal _tokenURIContract;

    struct Melody {
        bytes32 data1;
        bytes32 data2;
    }
    mapping(uint256 => Melody) internal _melodies;

    constructor(address maintainer, IWavTokenURI tokenURIContract) {
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
        bytes32 d1 = _melodies[id].data1;
        bytes32 d2 = _melodies[id].data2;
        return _tokenURIContract.wav(d1, d2);
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
}
