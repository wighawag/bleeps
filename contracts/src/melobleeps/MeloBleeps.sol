// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../base/ERC721Base.sol";
import "./MeloBleepsRoles.sol";
import "./MeloBleepsTokenURI.sol";

contract MeloBleeps is ERC721Base, MeloBleepsRoles {
    event TokenURIContractSet(MeloBleepsTokenURI newTokenURIContract);

    /// @notice the contract that actually generate the sound (and all metadata via the a data: uri as tokenURI)
    MeloBleepsTokenURI public tokenURIContract;

    struct Melody {
        bytes32 data1;
        bytes32 data2;
        address payable artist;
    }
    mapping(uint256 => Melody) internal _melodies;
    uint256 _supply = 0;

    struct BleepUsed {
        uint104 num;
        uint152 value;
    }
    mapping(uint256 => BleepUsed) public bleepsUsed;

    /// @dev Create the MeloBleeps contract
    //TODO: openseaProxyRegistry allow Bleeps to be sold on opensea without prior approval tx as long as the user have already an opensea proxy.
    /// @param initialOwner address that can execute on behalf of Bleeps (example: can claim ENS name).
    /// @param initialTokenURIAdmin admin able to update the tokenURI contract.
    /// @param initialRoyaltyAdmin admin able to update the royalty recipient and rates.
    /// @param initialMinterAdmin admin able to set the minter contract.
    /// @param initialGuardian guardian able to immortalize rules
    /// @param initialTokenURIContract initial tokenURI contract that generate the metadata including the wav file.
    constructor(
        address initialOwner,
        address initialTokenURIAdmin,
        address initialRoyaltyAdmin,
        address initialMinterAdmin,
        address initialGuardian,
        MeloBleepsTokenURI initialTokenURIContract
    ) MeloBleepsRoles(initialOwner, initialTokenURIAdmin, initialRoyaltyAdmin, initialMinterAdmin, initialGuardian) {
        tokenURIContract = initialTokenURIContract;
        emit TokenURIContractSet(initialTokenURIContract);
    }

    /// @notice A descriptive name for a collection of NFTs in this contract
    function name() public pure override returns (string memory) {
        return "MeloBleeps, Melodies of Bleeps";
    }

    /// @notice An abbreviated name for NFTs in this contract
    function symbol() external pure returns (string memory) {
        return "MBLEEP";
    }

    function tokenURI(uint256 id) external view returns (string memory) {
        bytes32 d1 = _melodies[id].data1;
        bytes32 d2 = _melodies[id].data2;
        return tokenURIContract.wav(d1, d2);
    }

    function setTokenURIContract(MeloBleepsTokenURI newTokenURIContract) external {
        require(msg.sender == tokenURIAdmin, "NOT_AUTHORIZED");
        tokenURIContract = newTokenURIContract;
        emit TokenURIContractSet(newTokenURIContract);
    }

    function mint(
        address payable artist,
        bytes32 data1,
        bytes32 data2,
        address to
    ) external returns (uint256 id) {
        // TODO prevent same one
        // record bleeps used and value
        require(msg.sender == minter, "ONLY_MINTER_ALLOWED");
        id = ++_supply;
        _melodies[id] = Melody(data1, data2, artist);
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        // _safeTransferFrom(address(0), to, id, "");
        _transferFrom(address(0), to, id);
    }

    function creatorOf(uint256 id) external view returns (address payable) {
        return _melodies[id].artist;
    }
}
