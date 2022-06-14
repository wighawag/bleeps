// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../bleeps/Bleeps.sol";
import "./MeloBleeps.sol";

import "../interfaces/IWETH.sol";

contract MeloBleepsAuctions {
    uint256 internal constant GWEI = 1000000000;

    uint32 internal constant TIME_BUFFER = 300;
    uint8 internal constant MIN_BID_INCREMENT_PERCENTAGE = 2;
    uint256 internal constant DURATION = 1 days;

    event AuctionSetup(address indexed artist, uint256 id, uint256 startTime);
    event AuctionBid(uint256 indexed id, address indexed bidder, uint256 amount, bool extended);
    event AuctionExtended(uint256 indexed id, uint256 endTime);
    event AuctionSettled(uint256 indexed id, address indexed bidder, uint256 amount);

    Bleeps internal immutable _bleeps;
    MeloBleeps internal immutable _meloBleeps;
    address payable internal immutable _bleepsDAOAccount;
    IWETH internal _weth;

    struct Auction {
        address payable lastBidder;
        uint64 amount;
        uint32 startTime;
    }

    mapping(uint256 => Auction) _auctions;

    constructor(
        IWETH weth,
        Bleeps bleeps,
        MeloBleeps meloBleeps,
        address payable bleepsDAOAccount
    ) {
        _weth = weth;
        _bleeps = bleeps;
        _meloBleeps = meloBleeps;
        _bleepsDAOAccount = bleepsDAOAccount;
    }

    // with frontrunning protection :
    // function submit(bytes32 nameHash, bytes32 melodyHash) external payable {
    // uint256 id = _meloBleeps.reserve(payable(msg.sender), nameHash, melodyHash);

    // without:
    function submit(
        string calldata name,
        bytes32 data1,
        bytes32 data2,
        uint8 speed
    ) external payable {
        uint256 id = _meloBleeps.reserveAndReveal(payable(msg.sender), name, data1, data2, speed);
        uint32 timestamp = uint32(block.timestamp);
        // numDays = 1, 8 hours = num seconds before midnight, 4pm UTC is the switch time
        uint32 startTime = ((((timestamp + 8 hours) / 1 days) + 1) * 1 days) - 8 hours; // 1 days = numDays
        _auctions[id].startTime = startTime; // next day

        emit AuctionSetup(msg.sender, id, startTime);

        if (msg.value > 0) {
            uint256 valueInGwei = msg.value / GWEI;
            if (valueInGwei > 0) {
                // you bid a reserved price, the Bleeps DAO cut will still apply but if nobody bid on top of your, you get to keep your Melody after paying that tax
                _auctions[id].lastBidder = payable(msg.sender);
                _auctions[id].amount = uint64(valueInGwei);
                emit AuctionBid(id, msg.sender, valueInGwei * GWEI, false);
            }
            if (valueInGwei * GWEI != msg.value) {
                payable(msg.sender).transfer(msg.value - valueInGwei * GWEI);
            }
        }
    }

    function bid(uint256 id, address payable bidder) external payable {
        Auction memory auction = _auctions[id];
        uint256 endTime = auction.startTime + DURATION;
        require(auction.startTime != 0, "AUCTION_NOT_EXIST");
        require(block.timestamp >= auction.startTime, "AUCTION_NOT_STARTED");

        require(block.timestamp < endTime, "AUCTION_EXPIRED");

        address lastBidder = auction.lastBidder;

        uint256 valueInGwei = msg.value / GWEI;
        require(valueInGwei >= auction.amount + ((auction.amount * MIN_BID_INCREMENT_PERCENTAGE) / 100), "NOT_ENOUGH");
        if (valueInGwei * GWEI != msg.value) {
            payable(msg.sender).transfer(msg.value - valueInGwei * GWEI);
        }

        _auctions[id].amount = uint64(valueInGwei);
        _auctions[id].lastBidder = bidder;

        uint256 timeLeft = endTime - block.timestamp;
        // Extend the auction if the bid was received within `TIME_BUFFER` of the auction end time
        bool extended = timeLeft < TIME_BUFFER;
        if (extended) {
            // we increase startTime because it is safe then
            auction.startTime += TIME_BUFFER - uint32(timeLeft);
            _auctions[id].startTime = auction.startTime;
        }
        emit AuctionBid(id, bidder, valueInGwei * GWEI, extended);

        if (extended) {
            emit AuctionExtended(id, auction.startTime + DURATION);
        }

        if (lastBidder != address(0)) {
            _safeTransferETHWithFallback(auction.lastBidder, auction.amount * GWEI);
        }
    }

    function settle(
        uint256 id,
        bytes32 data1,
        bytes32 data2,
        uint8 speed
    ) external {
        Auction memory auction = _auctions[id];
        require(auction.amount > 0, "NOTHING_TO_SETTLE"); // TODO add mechanism for artist to reclaim (or even anyone after some time) the piece

        uint256 endTime = auction.startTime + DURATION;
        require(auction.startTime != 0, "AUCTION_NOT_EXIST");
        require(block.timestamp >= endTime, "AUCTION_NOT_ENDED");

        _auctions[id].startTime = 0;
        _meloBleeps.mint(id, auction.lastBidder);

        // TODO pay back
        // _safeTransferETHWithFallback(owner(), _auction.amount);

        emit AuctionSettled(id, auction.lastBidder, auction.amount);

        address payable artist = _meloBleeps.creatorOf(id);
        uint256 forDAOInWEI = (auction.amount * GWEI * 10) / 100;
        uint256 forArtistInWEI = auction.amount * GWEI - forDAOInWEI;

        _safeTransferETHWithFallback(artist, forArtistInWEI);

        AddressWithWeight[] memory list = _getBleepsOwnerListWithWeight(id);
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i].account.send((auction.amount * GWEI * 5 * list[i].weight) / list.length / 100)) {
                forDAOInWEI -= (auction.amount * GWEI * 5 * list[i].weight) / list.length / 100;
                // TODO store or send ?
            }
        }

        _bleepsDAOAccount.transfer(forDAOInWEI); // CANNOT FAILS, the DAO account has been chosen to always accept ETH.
    }

    struct AddressWithWeight {
        address payable account;
        uint96 weight;
    }

    function _getBleepsOwnerListWithWeight(uint256 id) internal returns (AddressWithWeight[] memory list) {}

    // from Nouns Auction House : https://etherscan.io/address/0x830bd73e4184cef73443c15111a1df14e495c706
    /**
     * @notice Transfer ETH. If the ETH transfer fails, wrap the ETH and try send it as WETH.
     */
    function _safeTransferETHWithFallback(address to, uint256 amount) internal {
        if (!_safeTransferETH(to, amount)) {
            _weth.deposit{value: amount}();
            _weth.transfer(to, amount);
        }
    }

    /**
     * @notice Transfer ETH and return the success status.
     * @dev This function only forwards 30,000 gas to the callee.
     */
    function _safeTransferETH(address to, uint256 value) internal returns (bool) {
        (bool success, ) = to.call{value: value, gas: 30_000}(new bytes(0));
        return success;
    }
}
