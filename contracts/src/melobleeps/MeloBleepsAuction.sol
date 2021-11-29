// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../bleeps/Bleeps.sol";
import "./MeloBleeps.sol";

contract MeloBleepsAuction {
    uint256 internal constant GWEI = 1000000000;

    event AuctionStarted(address indexed artist, uint256 id, uint256 startPrice, uint256 endPrice, uint256 duration);

    Bleeps internal immutable _bleeps;
    MeloBleeps internal immutable _meloBleeps;
    address payable internal immutable _bleepsDAOAccount;

    struct Auction {
        uint64 startTime;
        uint64 startPriceinGWEI;
        uint64 endPriceinGWEI;
        uint64 duration;
    }

    mapping(uint256 => Auction) _auctions;

    constructor(
        Bleeps bleeps,
        MeloBleeps meloBleeps,
        address payable bleepsDAOAccount
    ) {
        _bleeps = bleeps;
        _meloBleeps = meloBleeps;
        _bleepsDAOAccount = bleepsDAOAccount;
    }

    function mint(
        address payable artist,
        bytes32 data1,
        bytes32 data2,
        uint256 startPrice,
        uint256 endPrice,
        uint256 duration
    ) external {
        uint64 startPriceinGWEI = uint64(startPrice / GWEI);
        require(startPrice == uint256(startPriceinGWEI) * GWEI, "Price need to be multiple of 1000000000000");
        uint64 endPriceinGWEI = uint64(endPrice / GWEI);
        require(endPrice == uint256(endPriceinGWEI) * GWEI, "Price need to be multiple of 1000000000000");

        require(duration < (1 << 32), "DURATION TOO BIG");

        uint256 id = _meloBleeps.mint(artist, data1, data2, address(this));
        _auctions[id] = Auction(uint64(block.timestamp), startPriceinGWEI, endPriceinGWEI, uint64(duration));
        emit AuctionStarted(artist, id, startPrice, endPrice, duration);
    }

    function purchase(uint256 id, address to) external payable {
        Auction memory auction = _auctions[id];
        uint256 expectedValue;
        uint256 timePassed = (block.timestamp - auction.startTime);
        uint256 priceDiffinGWEI = (auction.startPriceinGWEI - auction.endPriceinGWEI);
        if (timePassed >= auction.duration) {
            expectedValue = auction.endPriceinGWEI * GWEI;
        } else {
            expectedValue =
                (auction.endPriceinGWEI + (priceDiffinGWEI * (auction.duration - timePassed)) / auction.duration) *
                GWEI;
        }
        require(msg.value >= expectedValue, "NOT_ENOUGH");
        payable(msg.sender).transfer(msg.value - expectedValue); // refund extra

        _meloBleeps.safeTransferFrom(address(this), to, id);

        address payable artist = _meloBleeps.creatorOf(id);
        uint256 forDAO = expectedValue;
        if (artist.send((expectedValue * 5) / 100)) {
            forDAO -= (expectedValue * 5) / 100;
        }

        AddressWithWeight[] memory list = _getBleepsOwnerListWithWeight(id);
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i].account.send((expectedValue * 5 * list[i].weight) / list.length / 100)) {
                forDAO -= (msg.value * 5 * list[i].weight) / list.length / 100;
            }
        }
        _bleepsDAOAccount.transfer(forDAO); // CANNOT FAILS, the DAO account has been chosen to always accept ETH.
    }

    struct AddressWithWeight {
        address payable account;
        uint96 weight;
    }

    function _getBleepsOwnerListWithWeight(uint256 id) internal returns (AddressWithWeight[] memory list) {}
}
