// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "./Bleeps.sol";
import "../interfaces/IBleepsSale.sol";
import "./SaleBase.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract BleepsFixedPriceSale is IBleepsSale, SaleBase {
    using ECDSA for bytes32;

    uint256 internal immutable _price;
    uint256 internal immutable _whitelistPrice;
    uint256 internal immutable _whitelistTimeLimit;
    bytes32 internal immutable _whitelistMerkleRoot;

    uint256 _uptoInstr;
    mapping(uint256 => uint256) internal _passUsed;

    constructor(
        Bleeps bleeps,
        uint256 price,
        uint256 whitelistPrice,
        uint256 whitelistTimeLimit,
        bytes32 whitelistMerkleRoot,
        address payable recipient,
        IERC721 mandalas,
        uint256 mandalasDiscountPercentage,
        uint256 uptoInstr
    ) SaleBase(bleeps, recipient, mandalas, mandalasDiscountPercentage) {
        _price = price;
        _whitelistPrice = whitelistPrice;
        _whitelistTimeLimit = whitelistTimeLimit;
        _whitelistMerkleRoot = whitelistMerkleRoot;
        _uptoInstr = uptoInstr;
    }

    function priceInfo(address purchaser)
        external
        view
        returns (
            uint256 price,
            uint256 whitelistPrice,
            uint256 whitelistTimeLimit,
            bytes32 whitelistMerkleRoot,
            uint256 mandalasDiscountPercentage,
            bool hasMandalas
        )
    {
        return (
            _price,
            _whitelistPrice,
            _whitelistTimeLimit,
            _whitelistMerkleRoot,
            _mandalasDiscountPercentage,
            _hasMandalas(purchaser)
        );
    }

    function ownersAndPriceInfo(
        address purchaser,
        uint256 passId,
        uint256[] calldata ids
    )
        external
        view
        returns (
            address[] memory addresses,
            uint256 price,
            uint256 whitelistPrice,
            uint256 whitelistTimeLimit,
            bytes32 whitelistMerkleRoot,
            uint256 mandalasDiscountPercentage,
            bool hasMandalas,
            bool passUsed,
            uint256 uptoInstr
        )
    {
        addresses = _bleeps.owners(ids);
        price = _price;
        whitelistPrice = _whitelistPrice;
        whitelistTimeLimit = _whitelistTimeLimit;
        whitelistMerkleRoot = _whitelistMerkleRoot;
        mandalasDiscountPercentage = _mandalasDiscountPercentage;
        hasMandalas = _hasMandalas(purchaser);
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

    function isReserved(uint256 id) public returns (bool) {
        uint256 instr = (uint256(id) >> 6) % 16;
        return (instr == 6 || instr == 8);
    }

    function isOpenForSale(uint256 id) public returns (bool) {
        uint256 instr = (uint256(id) >> 6) % 16;
        return instr <= _uptoInstr;
    }

    function mint(uint16 id, address to) public payable {
        require(block.timestamp >= _whitelistTimeLimit, "REQUIRE_PASS_OR_WAIT");
        _payAndMint(id, to);
    }

    function recipientMint(uint16 id, address to) external {
        require(msg.sender == _recipient, "NOT_AUTHORIZED");
        require(id < 576, "INVALID_SOUND");
        require(isReserved(id), "NOT_RESERVED");
        _bleeps.mint(id, to);
    }

    function mintWithPassId(
        uint16 id,
        address to,
        uint256 passId,
        bytes32[] memory proof
    ) external payable {
        if (block.timestamp < _whitelistTimeLimit) {
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
        if (block.timestamp < _whitelistTimeLimit) {
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
        require(id < 576, "INVALID_SOUND");
        require(isOpenForSale(id), "INSTURMENT_NOT_YET_FOR_SALE");
        require(!isReserved(id), "RESERVED");

        uint256 expectedValue = block.timestamp >= _whitelistTimeLimit ? _price : _whitelistPrice;

        if (_mandalasDiscountPercentage > 0 && _hasMandalas(msg.sender)) {
            expectedValue = expectedValue - (expectedValue * _mandalasDiscountPercentage) / 100;
        }
        require(msg.value >= expectedValue, "NOT_ENOUGH");
        payable(msg.sender).transfer(msg.value - expectedValue);
        _recipient.transfer(expectedValue);

        _bleeps.mint(id, to);
    }
}
