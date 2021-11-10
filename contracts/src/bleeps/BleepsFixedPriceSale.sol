// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "./Bleeps.sol";
import "../interfaces/IBleepsSale.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract BleepsFixedPriceSale is IBleepsSale {
    Bleeps internal immutable _bleeps;
    uint256 internal immutable _price;
    bytes32 internal immutable _whitelistMerkleRoot;
    address payable internal immutable _recipient;
    IERC721 internal immutable _mandalas;
    uint256 internal immutable _mandalasDiscountPercentage;

    constructor(
        Bleeps bleeps,
        uint256 price,
        bytes32 whitelistMerkleRoot,
        address payable recipient,
        IERC721 mandalas,
        uint256 mandalasDiscountPercentage
    ) {
        _bleeps = bleeps;
        _price = price;
        _whitelistMerkleRoot = whitelistMerkleRoot;
        _recipient = recipient;
        _mandalas = mandalas;
        _mandalasDiscountPercentage = mandalasDiscountPercentage;
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

    function mint(uint16 id, address to) external payable {
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

    function _hasMandalas(address owner) internal view returns (bool) {
        (bool success, bytes memory returnData) = address(_mandalas).staticcall(
            abi.encodeWithSignature("balanceOf(address)", owner)
        );
        uint256 numMandalas = success && returnData.length > 0 ? abi.decode(returnData, (uint256)) : 0;
        return numMandalas > 0;
    }
}
