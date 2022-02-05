// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../base/ERC721Base.sol";
import "./MeloBleepsRoles.sol";
import "./MeloBleepsTokenURI.sol";
import "../lib/ShortString.sol";

contract MeloBleeps is ERC721Base, MeloBleepsRoles {
    event TokenURIContractSet(MeloBleepsTokenURI newTokenURIContract);
    event ReservationSubmitted(address indexed artist, uint256 id, bytes32 melobleepsHash, string name, uint8 speed);

    /// @notice the contract that actually generate the sound (and all metadata via the a data: uri as tokenURI)
    MeloBleepsTokenURI public tokenURIContract;

    struct MelodyMetadata {
        address payable artist;
        uint8 speed;
    }
    struct MelodyData {
        bytes32 data1;
        bytes32 data2;
    }
    mapping(uint256 => MelodyMetadata) internal _melodyMetadatas;
    mapping(uint256 => MelodyData) internal _melodyDatas;

    // allow artist to name the piece (optional, cost 2 storage slot)
    mapping(uint256 => ShortString) internal _named;
    mapping(ShortString => uint256) internal _names;

    uint256 _supply = 0;

    mapping(bytes32 => uint256) internal _reservations;

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
        bytes32 d1 = _melodyDatas[id].data1;
        bytes32 d2 = _melodyDatas[id].data2;
        address artist = _melodyMetadatas[id].artist;
        uint8 speed = _melodyMetadatas[id].speed;
        ShortString name = _named[id];
        return tokenURIContract.tokenURI(d1, d2, speed, toString(name));
    }

    function setTokenURIContract(MeloBleepsTokenURI newTokenURIContract) external {
        require(msg.sender == tokenURIAdmin, "NOT_AUTHORIZED");
        tokenURIContract = newTokenURIContract;
        emit TokenURIContractSet(newTokenURIContract);
    }

    // TODO remove
    function reserveAndMint(
        string calldata name,
        uint8 speed,
        bytes32 data1,
        bytes32 data2,
        address to
    ) external returns (uint256 id) {
        id = ++_supply;

        _melodyMetadatas[id].artist = payable(msg.sender);
        _melodyMetadatas[id].speed = speed;

        if (bytes(name).length > 0) {
            ShortString shortString = toShortString(name);
            require(_names[shortString] == 0, "NAME_ALREADY_TAKEN");
            _names[shortString] = id;
            _named[id] = shortString;
        }
        _melodyDatas[id].data1 = data1;
        _melodyDatas[id].data2 = data2;

        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        // _safeTransferFrom(address(0), to, id, "");
        _transferFrom(address(0), to, id);
    }

    function reserve(
        address payable artist,
        string calldata name,
        bytes32 melobleepsHash,
        uint8 speed
    ) external returns (uint256 id) {
        require(msg.sender == minter, "ONLY_MINTER_ALLOWED");
        id = ++_supply;

        require(_reservations[melobleepsHash] == 0, "ALREADY_RESERVED"); // TODO allow reservation expiry ?

        _reservations[melobleepsHash] = id;
        _melodyMetadatas[id].artist = artist;
        _melodyMetadatas[id].speed = speed;

        if (bytes(name).length > 0) {
            ShortString shortString = toShortString(name);
            require(_names[shortString] == 0, "NAME_ALREADY_TAKEN");
            _names[shortString] = id;
            _named[id] = shortString;
        }
        emit ReservationSubmitted(artist, id, melobleepsHash, name, speed);
    }

    function mint(
        uint256 id,
        bytes32 data1,
        bytes32 data2,
        address to
    ) external {
        require(msg.sender == minter, "ONLY_MINTER_ALLOWED");
        address payable artist = creatorOf(id);

        // TODO normalize data1 and data2 => volume 0 means note 0 and instrument 0
        bytes32 computedHash = keccak256(abi.encodePacked(data1, data2));
        uint256 computedId = _reservations[computedHash];
        require(id == computedId, "INVALID_HASH");
        require(_ownerOf(id) == address(0), "ALREADY_MINTED"); // TODO use uint256 data == 0 so we can burn Melodies ?

        _melodyDatas[id].data1 = data1;
        _melodyDatas[id].data2 = data2;
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        // _safeTransferFrom(address(0), to, id, "");
        _transferFrom(address(0), to, id);
    }

    function creatorOf(uint256 id) public view returns (address payable) {
        return _melodyMetadatas[id].artist;
    }
}
