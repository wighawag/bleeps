// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./Bleeps.sol";
import "../interfaces/IBleepsSale.sol";
import "./SaleBase.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// Work In Progress, abandoned for BleepsFixedPriceSale
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
        address payable projectCreator,
        uint256 creatorFeePer10000,
        address payable saleRecipient
    ) SaleBase(bleeps, projectCreator, creatorFeePer10000, saleRecipient) {
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
            uint256 lastPrice
        )
    {
        return (_startTime, _initPrice, _delay, _lastPrice);
    }

    function ownersAndPriceInfo(address purchaser, uint256[] calldata ids)
        external
        view
        returns (
            address[] memory addresses,
            uint256 startTime,
            uint256 initPrice,
            uint256 delay,
            uint256 lastPrice
        )
    {
        addresses = _bleeps.owners(ids);
        startTime = _startTime;
        initPrice = _initPrice;
        delay = _delay;
        lastPrice = _lastPrice;
    }

    function mint(uint16 id, address to) external payable {
        require(id < 576, "INVALID_SOUND");
        uint256 instr = (uint256(id) >> 6) % 16;

        if (instr == 7 || instr == 8) {
            require(msg.sender == _projectCreator, "These bleeps are reserved");
        } else {
            uint256 expectedValue = _initPrice;
            uint256 timePassed = (block.timestamp - _startTime);
            uint256 priceDiff = _initPrice - _lastPrice;
            if (timePassed >= _delay) {
                expectedValue = _lastPrice;
            } else {
                expectedValue = _lastPrice + (priceDiff * (_delay - timePassed)) / _delay;
            }

            require(msg.value >= expectedValue, "NOT_ENOUGH");
            payable(msg.sender).transfer(msg.value - expectedValue);
            _paymentToRecipient(expectedValue);
        }
        _bleeps.mint(id, to);
    }

    function isReserved(uint256 id) public pure returns (bool) {
        uint256 instr = (uint256(id) >> 6) % 16;
        return (instr == 7 || instr == 8);
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
}
