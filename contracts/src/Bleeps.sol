// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

/* solhint-disable quotes */

import "./lib/ERC721Checkpointable.sol";
import "./BleepsTokenURI.sol";

contract Bleeps is ERC721Checkpointable {
    // _maintainer only roles is to update the tokenURI contract, useful in case there are any wav generation bug to fix or improvement to make, the plan is to revoke that role when the project has been time-tested
    address internal _maintainer;
    address payable internal _recipient;
    BleepsTokenURI internal _tokenURIContract;

    uint256 internal immutable _startTime;
    uint256 internal immutable _initPrice;
    uint256 internal immutable _delay;
    uint256 internal immutable _lastPrice;

    constructor(
        uint256 initPrice,
        uint256 delay,
        uint256 lastPrice,
        uint256 startTime,
        address maintainer,
        address payable recipient,
        BleepsTokenURI tokenURIContract
    ) ERC721("Bleeps", "BLEEP") {
        _initPrice = initPrice;
        _delay = delay;
        _lastPrice = lastPrice;
        _startTime = startTime;
        _maintainer = maintainer;
        _recipient = recipient;
        _tokenURIContract = tokenURIContract;
    }

    function priceInfo()
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

    function tokenURI(uint256 id) public view override returns (string memory) {
        return _tokenURIContract.wav(uint16(id));
    }

    function setTokenURIContract(BleepsTokenURI newTokenURIContract) external {
        require(msg.sender == _maintainer, "NOT_AUTHORIZED");
        _tokenURIContract = newTokenURIContract;
    }

    function setMaintainer(address newMaintainer) external {
        require(msg.sender == _maintainer, "NOT_AUTHORIZED");
        _maintainer = newMaintainer;
    }

    function setRecipient(address payable newRecipient) external {
        require(msg.sender == _maintainer, "NOT_AUTHORIZED");
        _recipient = newRecipient;
    }

    function ownersAndPriceInfo(uint256[] calldata ids)
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
        addresses = new address[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            addresses[i] = _exists(id) ? ownerOf(id) : address(0);
        }
        startTime = _startTime;
        initPrice = _initPrice;
        delay = _delay;
        lastPrice = _lastPrice;
    }

    function mint(uint16 id, address to) external payable {
        uint256 instr = (uint256(id) >> 6) % 64;

        if (instr == 6) {
            require(msg.sender == _recipient, "Noise's bleeps are reserved");
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
            _recipient.transfer(expectedValue);
        }

        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        require(!_exists(id), "ALREADY_CREATED");
        _safeMint(to, id);
    }
}
