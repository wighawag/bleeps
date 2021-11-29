// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./Bleeps.sol";
import "../interfaces/IBleepsSale.sol";
import "./SaleBase.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract BleepsFixedPriceSale is IBleepsSale, SaleBase {
    using ECDSA for bytes32;

    uint256 internal immutable _price;
    uint256 internal immutable _startTime;
    uint256 internal immutable _whitelistPrice;
    uint256 internal immutable _whitelistEndTime;
    bytes32 internal immutable _whitelistMerkleRoot;

    uint256 internal _uptoInstr;
    mapping(uint256 => uint256) internal _passUsed;

    constructor(
        Bleeps bleeps,
        uint256 price,
        uint256 startTime,
        uint256 whitelistPrice,
        uint256 whitelistEndTime,
        bytes32 whitelistMerkleRoot,
        address payable projectCreator,
        uint256 creatorFeePer10000,
        address payable saleRecipient,
        uint256 uptoInstr
    ) SaleBase(bleeps, projectCreator, creatorFeePer10000, saleRecipient) {
        _price = price;
        _startTime = startTime;
        _whitelistPrice = whitelistPrice;
        _whitelistEndTime = whitelistEndTime;
        _whitelistMerkleRoot = whitelistMerkleRoot;
        _uptoInstr = uptoInstr;
    }

    function priceInfo()
        external
        view
        returns (
            uint256 price,
            uint256 startTime,
            uint256 whitelistPrice,
            uint256 whitelistEndTime,
            bytes32 whitelistMerkleRoot
        )
    {
        return (_price, _startTime, _whitelistPrice, _whitelistEndTime, _whitelistMerkleRoot);
    }

    function ownersAndPriceInfo(uint256 passId, uint256[] calldata ids)
        external
        view
        returns (
            address[] memory addresses,
            uint256 price,
            uint256 startTime,
            uint256 whitelistPrice,
            uint256 whitelistEndTime,
            bytes32 whitelistMerkleRoot,
            bool passUsed,
            uint256 uptoInstr
        )
    {
        addresses = _bleeps.owners(ids);
        price = _price;
        startTime = _startTime;
        whitelistPrice = _whitelistPrice;
        whitelistEndTime = _whitelistEndTime;
        whitelistMerkleRoot = _whitelistMerkleRoot;
        passUsed = isPassUsed(passId);
        uptoInstr = _uptoInstr;
    }

    function isPassUsed(uint256 passId) public view returns (bool) {
        uint256 passBlock = passId / 256;
        uint256 mask = (1 << (passId - (256 * passBlock)));
        return _passUsed[passBlock] & mask == mask;
    }

    function usePassIfAvailable(uint256 passId) internal {
        uint256 passBlock = passId / 256;
        uint256 mask = (1 << (passId - (256 * passBlock)));
        uint256 passBitMask = _passUsed[passBlock];
        require(passBitMask & mask == 0, "PASS_ALREADY_USED");
        _passUsed[passBlock] = passBitMask | mask;
    }

    function isReserved(uint256 id) public pure returns (bool) {
        uint256 instr = (uint256(id) >> 6) % 16;
        return (instr == 7 || instr == 8);
    }

    function isOpenForSale(uint256 id) public view returns (bool) {
        uint256 instr = (uint256(id) >> 6) % 16;
        return instr <= _uptoInstr;
    }

    function mint(uint16 id, address to) public payable {
        require(block.timestamp >= _whitelistEndTime, "REQUIRE_PASS_OR_WAIT");
        _payAndMint(id, to);
    }

    function creatorMint(uint16 id, address to) external {
        require(msg.sender == _projectCreator, "NOT_AUTHORIZED");
        require(id < 576, "INVALID_SOUND");
        require(isReserved(id), "NOT_RESERVED");
        _bleeps.mint(id, to);
    }

    function creatorMultiMint(uint16[] calldata ids, address to) external {
        require(msg.sender == _projectCreator, "NOT_AUTHORIZED");

        // check if reserved
        for (uint256 i = 0; i < ids.length; i++) {
            require(ids[i] < 576, "INVALID_SOUND");
            require(isReserved(ids[i]), "NOT_RESERVED");
        }

        // mint all ids
        _bleeps.multiMint(ids, to);
    }

    function mintWithPassId(
        uint16 id,
        address to,
        uint256 passId,
        bytes32[] memory proof
    ) external payable {
        if (block.timestamp < _whitelistEndTime) {
            usePassIfAvailable(passId);

            address signer = msg.sender;
            bytes32 leaf = _generatePassHash(passId, signer);
            require(_verify(proof, leaf), "INVALID_PROOF");
        }
        _payAndMint(id, to);
    }

    function mintWithSalePass(
        uint16 id,
        address to,
        uint256 passId,
        bytes memory signature,
        bytes32[] memory proof
    ) external payable {
        if (block.timestamp < _whitelistEndTime) {
            usePassIfAvailable(passId);

            address signer = keccak256(abi.encodePacked(passId, to)).recover(signature);
            bytes32 leaf = _generatePassHash(passId, signer);
            require(_verify(proof, leaf), "INVALID_PROOF");
        }
        _payAndMint(id, to);
    }

    function _generatePassHash(uint256 passId, address signer) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(passId, signer));
    }

    function _verify(bytes32[] memory proof, bytes32 computedHash) internal view returns (bool) {
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == _whitelistMerkleRoot;
    }

    function _payAndMint(uint16 id, address to) internal {
        require(block.timestamp >= _startTime, "SALE_NOT_STARTED");
        require(id < 576, "INVALID_SOUND");
        require(isOpenForSale(id), "INSTURMENT_NOT_YET_FOR_SALE");
        require(!isReserved(id), "RESERVED");

        uint256 expectedValue = block.timestamp >= _whitelistEndTime ? _price : _whitelistPrice;

        require(msg.value >= expectedValue, "NOT_ENOUGH");
        if (msg.value > expectedValue) {
            payable(msg.sender).transfer(msg.value - expectedValue);
        }
        _paymentToRecipient(expectedValue);
        _bleeps.mint(id, to);
    }
}
