// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../base/ERC721Base.sol";
import "./MeloBleepsRoles.sol";
import "./MeloBleepsTokenURI.sol";

// import "../lib/ShortString.sol";

contract MeloBleeps is ERC721Base, MeloBleepsRoles {
    event TokenURIContractSet(MeloBleepsTokenURI newTokenURIContract);
    event MelodyReserved(address indexed artist, uint256 id, bytes32 nameHash, bytes32 melodyHash);
    event MelodyRevealed(
        address indexed artist,
        uint256 indexed id,
        string name,
        bytes32 data1,
        bytes32 data2,
        uint8 speed
    );

    // TODO public ?
    uint256 internal _counter;
    mapping(bytes32 => uint256) internal _reservations;

    /// @notice the contract that actually generate the sound (and all metadata via the a data: uri as tokenURI)
    MeloBleepsTokenURI public tokenURIContract;

    struct MelodyMetadata {
        address payable artist;
        bool useName;
        uint8 speed;
    }
    struct MelodyData {
        bytes32 data1;
        bytes32 data2;
    }
    mapping(uint256 => MelodyMetadata) internal _melodyMetadatas;
    mapping(uint256 => MelodyData) internal _melodyDatas;

    mapping(uint256 => string) internal _named;
    mapping(bytes32 => uint256) internal _nameHashes;

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
        return tokenURIContract.tokenURI(d1, d2, speed, _named[id]);
    }

    function setTokenURIContract(MeloBleepsTokenURI newTokenURIContract) external {
        require(msg.sender == tokenURIAdmin, "NOT_AUTHORIZED");
        tokenURIContract = newTokenURIContract;
        emit TokenURIContractSet(newTokenURIContract);
    }

    function reserve(
        address payable artist,
        bytes32 nameHash,
        bytes32 melodyHash
    ) internal returns (uint256 id) {
        require(msg.sender == minter, "ONLY_MINTER_ALLOWED");
        id = _unsafe_reserve(artist, nameHash, melodyHash);
    }

    function reserveAndReveal(
        address payable artist,
        string calldata name,
        bytes32 data1,
        bytes32 data2,
        uint8 speed
    ) external returns (uint256 id) {
        require(msg.sender == minter, "ONLY_MINTER_ALLOWED");
        id = _unsafe_reserve_and_reveal(artist, name, data1, data2, speed);
    }

    function reserveRevealAndMint(
        address payable artist,
        string calldata name,
        bytes32 data1,
        bytes32 data2,
        uint8 speed,
        address to
    ) external returns (uint256 id) {
        require(msg.sender == minter, "ONLY_MINTER_ALLOWED");
        id = _unsafe_reserve_and_reveal(artist, name, data1, data2, speed);
        _unsafe_mint(id, to);
    }

    function reveal(
        uint256 id,
        string calldata name,
        bytes32 data1,
        bytes32 data2,
        uint8 speed,
        bytes32 nameHash
    ) external {
        require(msg.sender == minter, "ONLY_MINTER_ALLOWED");
        _unsafe_reveal(id, name, data1, data2, speed, nameHash);
    }

    function revealAndMint(
        uint256 id,
        string calldata name,
        bytes32 data1,
        bytes32 data2,
        uint8 speed,
        bytes32 nameHash,
        address to
    ) external {
        require(msg.sender == minter, "ONLY_MINTER_ALLOWED");
        _unsafe_reveal(id, name, data1, data2, speed, nameHash);
        _unsafe_mint(id, to);
    }

    function mint(uint256 id, address to) external {
        require(msg.sender == minter, "ONLY_MINTER_ALLOWED");
        _unsafe_mint(id, to);
    }

    function creatorOf(uint256 id) public view returns (address payable) {
        return _melodyMetadatas[id].artist;
    }

    // -------
    // INTERNAL
    // -------

    function _unsafe_reserve(
        address payable artist,
        bytes32 nameHash,
        bytes32 melodyHash
    ) internal returns (uint256 id) {
        require(artist != address(0), "NOT_ARTIST_ZEROADDRESS");
        id = ++_counter;

        if (nameHash != 0) {
            require(_nameHashes[nameHash] == 0, "NAME_ALREADY_TAKEN");
            _nameHashes[nameHash] = id;
            _melodyMetadatas[id].useName = true;
        }

        _reservations[melodyHash] = id;
        _melodyMetadatas[id].artist = artist;

        emit MelodyReserved(artist, id, nameHash, melodyHash);
    }

    function _unsafe_reveal(
        uint256 id,
        string memory name,
        bytes32 data1,
        bytes32 data2,
        uint8 speed,
        bytes32 nameHash
    ) internal {
        address artist = _melodyMetadatas[id].artist;
        bool useName = _melodyMetadatas[id].useName;
        require(artist != address(0), "NEED_RESERVATION");

        require(speed != 0, "INVALID_SPEED");

        // TODO normalize data1 and data2 => volume 0 means note 0 and instrument 0
        bytes32 computedHash = keccak256(abi.encodePacked(data1, data2, speed));
        uint256 computedId = _reservations[computedHash];
        require(id == computedId, "INVALID_HASH");

        if (useName) {
            require(id == _nameHashes[nameHash], "NAMEHASH_NOT_MATCHING_ID");
            require(keccak256(abi.encodePacked(name)) == nameHash, "NAME_NOT_MATCHING");
            _named[id] = name;
        } else {
            require(bytes(name).length == 0, "UNNAMED");
        }

        _melodyMetadatas[id].speed = speed;
        _melodyDatas[id].data1 = data1;
        _melodyDatas[id].data2 = data2;

        emit MelodyRevealed(artist, id, name, data1, data2, speed);
    }

    function _unsafe_reserve_and_reveal(
        address payable artist,
        string memory name,
        bytes32 data1,
        bytes32 data2,
        uint8 speed
    ) internal returns (uint256 id) {
        require(artist != address(0), "NOT_ARTIST_ZEROADDRESS");
        require(speed != 0, "INVALID_SPEED");
        id = ++_counter;

        bool useName = bytes(name).length != 0;

        bytes32 nameHash;
        if (useName) {
            nameHash = keccak256(abi.encodePacked(name));
            require(_nameHashes[nameHash] == 0, "NAME_ALREADY_TAKEN");
            _nameHashes[nameHash] = id;
            _melodyMetadatas[id].useName = true; // NOT NEEDED REALLY
            _named[id] = name;
        }

        bytes32 melodyHash = keccak256(abi.encodePacked(data1, data2, speed));
        _reservations[melodyHash] = id;
        _melodyMetadatas[id].artist = artist;

        emit MelodyReserved(artist, id, nameHash, melodyHash);

        _melodyMetadatas[id].speed = speed;
        _melodyDatas[id].data1 = data1;
        _melodyDatas[id].data2 = data2;

        emit MelodyRevealed(artist, id, name, data1, data2, speed);
    }

    function _unsafe_mint(uint256 id, address to) internal {
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");

        require(_melodyMetadatas[id].artist != address(0), "NEED_RESERVATION");
        require(_melodyMetadatas[id].speed != 0, "NEED_REVEAL");

        // TODO use uint256 data == 0 so we can burn Melodies ?
        require(_ownerOf(id) == address(0), "ALREADY_MINTED");

        _safeTransferFrom(address(0), to, id, "");
    }

    // TODO REMOVE:
    function reserveAndMint(
        string calldata name,
        uint8 speed,
        bytes32 data1,
        bytes32 data2,
        address to
    ) external returns (uint256 id) {
        id = _unsafe_reserve_and_reveal(payable(msg.sender), name, data1, data2, speed);
        _unsafe_mint(id, to);
    }
}
