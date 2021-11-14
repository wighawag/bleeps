// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "./Bleeps.sol";
import "../interfaces/IBleepsSale.sol";
import "./SaleBase.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract BleepsDutchAuction is IBleepsSale, SaleBase {
    uint256 internal immutable _startTime;
    uint256 internal immutable _initPrice;
    uint256 internal immutable _delay;
    uint256 internal immutable _lastPrice;

    constructor(
        Bleeps bleeps,
        uint256 initPrice,
        uint256 delay,
        uint256 lastPrice,
        uint256 startTime,
        address payable recipient,
        IERC721 mandalas,
        uint256 mandalasDiscountPercentage
    ) SaleBase(bleeps, recipient, mandalas, mandalasDiscountPercentage) {
        _initPrice = initPrice;
        _delay = delay;
        _lastPrice = lastPrice;
        _startTime = startTime;
    }

    function priceInfo(address purchaser)
        external
        view
        returns (
            uint256 startTime,
            uint256 initPrice,
            uint256 delay,
            uint256 lastPrice,
            uint256 mandalasDiscountPercentage,
            bool hasMandalas
        )
    {
        return (_startTime, _initPrice, _delay, _lastPrice, _mandalasDiscountPercentage, _hasMandalas(purchaser));
    }

    function ownersAndPriceInfo(address purchaser, uint256[] calldata ids)
        external
        view
        returns (
            address[] memory addresses,
            uint256 startTime,
            uint256 initPrice,
            uint256 delay,
            uint256 lastPrice,
            uint256 mandalasDiscountPercentage,
            bool hasMandalas
        )
    {
        addresses = _bleeps.owners(ids);
        startTime = _startTime;
        initPrice = _initPrice;
        delay = _delay;
        lastPrice = _lastPrice;
        mandalasDiscountPercentage = _mandalasDiscountPercentage;
        hasMandalas = _hasMandalas(purchaser);
    }

    function mint(uint16 id, address to) external payable {
        require(id < 576, "INVALID_SOUND");
        uint256 instr = (uint256(id) >> 6) % 16;

        if (instr == 7 || instr == 8) {
            require(msg.sender == _recipient, "These bleeps are reserved");
        } else {
            uint256 expectedValue = _initPrice;
            uint256 timePassed = (block.timestamp - _startTime);
            uint256 priceDiff = _initPrice - _lastPrice;
            if (timePassed >= _delay) {
                expectedValue = _lastPrice;
            } else {
                expectedValue = _lastPrice + (priceDiff * (_delay - timePassed)) / _delay;
            }

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
