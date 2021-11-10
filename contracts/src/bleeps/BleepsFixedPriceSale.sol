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
    bytes32 internal immutable _whitelistMerkleRoot;

    uint256 internal _passUsed_1;
    uint256 internal _passUsed_2;

    constructor(
        Bleeps bleeps,
        uint256 price,
        bytes32 whitelistMerkleRoot,
        address payable recipient,
        IERC721 mandalas,
        uint256 mandalasDiscountPercentage
    ) SaleBase(bleeps, recipient, mandalas, mandalasDiscountPercentage) {
        _price = price;
        _whitelistMerkleRoot = whitelistMerkleRoot;
    }

    function priceInfo(address purchaser)
        external
        view
        returns (
            uint256 price,
            bytes32 whitelistMerkleRoot,
            uint256 mandalasDiscountPercentage,
            bool hasMandalas
        )
    {
        return (_price, _whitelistMerkleRoot, _mandalasDiscountPercentage, _hasMandalas(purchaser));
    }

    function ownersAndPriceInfo(address purchaser, uint256[] calldata ids)
        external
        view
        returns (
            address[] memory addresses,
            uint256 price,
            bytes32 whitelistMerkleRoot,
            uint256 mandalasDiscountPercentage,
            bool hasMandalas
        )
    {
        addresses = _bleeps.owners(ids);
        price = _price;
        whitelistMerkleRoot = _whitelistMerkleRoot;
        mandalasDiscountPercentage = _mandalasDiscountPercentage;
        hasMandalas = _hasMandalas(purchaser);
    }

    function isPassUsed(uint256 passId) public returns (bool) {
        if (passId > 511) {
            return false;
        } else if (passId > 255) {
            uint256 mask = (1 << (passId - 256));
            return _passUsed_2 & mask == mask;
        }
        uint256 mask = (1 << passId);
        return (_passUsed_1 & mask) == mask;
    }

    function mint(uint16 id, address to) external payable {
        // fails if whitelist?
        _mint(id, to);
    }

    function mintWithSalePass(
        uint16 id,
        address to,
        uint256 passId,
        bytes memory signature,
        bytes32[] memory proof
    ) external payable {
        require(passId < 512, "INVALID_PASS_ID");
        if (passId > 255) {
            uint256 mask = (1 << (passId - 256));
            require(_passUsed_2 & mask == 0, "PASS_ALREADY_USED");
            _passUsed_2 = _passUsed_2 | mask;
        } else {
            uint256 mask = (1 << passId);
            require(_passUsed_1 & mask == 0, "PASS_ALREADY_USED");
            _passUsed_1 = _passUsed_1 | mask;
        }

        address signer = keccak256(abi.encodePacked(passId, to)).recover(signature);
        bytes32 leaf = _generatePassHash(passId, signer);
        require(_verify(proof, leaf), "INVALID_PROOF");

        _mint(id, to);
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

    function _mint(uint16 id, address to) internal {
        require(id < 576, "INVALID_SOUND");
        uint256 instr = (uint256(id) >> 6) % 16;

        if (instr == 6 || instr == 8) {
            require(msg.sender == _recipient, "These bleeps are reserved");
        } else {
            uint256 expectedValue = _price;

            if (_hasMandalas(msg.sender)) {
                expectedValue = expectedValue - (expectedValue * _mandalasDiscountPercentage) / 100;
            }
            require(msg.value >= expectedValue, "NOT_ENOUGH");
            payable(msg.sender).transfer(msg.value - expectedValue);
            _recipient.transfer(expectedValue);
        }
        _bleeps.mint(id, to);
    }
}
