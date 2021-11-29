// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./Bleeps.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract SaleBase {
    Bleeps internal immutable _bleeps;
    address payable internal immutable _projectCreator;
    uint256 immutable _creatorFeePer10000;
    address payable internal immutable _saleRecipient;

    constructor(
        Bleeps bleeps,
        address payable projectCreator,
        uint256 creatorFeePer10000,
        address payable saleRecipient
    ) {
        _bleeps = bleeps;
        _projectCreator = projectCreator;
        _creatorFeePer10000 = creatorFeePer10000;
        _saleRecipient = saleRecipient;
    }

    function _paymentToRecipient(uint256 expectedValue) internal {
        if (expectedValue > 0) {
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
}
