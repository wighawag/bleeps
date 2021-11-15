// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "./Bleeps.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract SaleBase {
    Bleeps internal immutable _bleeps;
    address payable internal immutable _projectCreator;
    uint256 immutable _creatorFeePer10000;
    address payable internal immutable _saleRecipient;
    IERC721 internal immutable _mandalas;
    uint256 internal immutable _mandalasDiscountPercentage;

    constructor(
        Bleeps bleeps,
        address payable projectCreator,
        uint256 creatorFeePer10000,
        address payable saleRecipient,
        IERC721 mandalas,
        uint256 mandalasDiscountPercentage
    ) {
        _bleeps = bleeps;
        _projectCreator = projectCreator;
        _creatorFeePer10000 = creatorFeePer10000;
        _saleRecipient = saleRecipient;
        _mandalas = mandalas;
        _mandalasDiscountPercentage = mandalasDiscountPercentage;
    }

    function _hasMandalas(address owner) internal view returns (bool) {
        (bool success, bytes memory returnData) = address(_mandalas).staticcall(
            abi.encodeWithSignature("balanceOf(address)", owner)
        );
        uint256 numMandalas = success && returnData.length > 0 ? abi.decode(returnData, (uint256)) : 0;
        return numMandalas > 0;
    }

    function _paymentToRecipient(uint256 expectedValue) internal {
        if (_creatorFeePer10000 > 0) {
            uint256 fee = (expectedValue * _creatorFeePer10000) / 10000;
            _projectCreator.transfer(fee);
            expectedValue = expectedValue - fee;
        }
        if (expectedValue > 0) {
            _saleRecipient.transfer(expectedValue);
        }
    }
}
