// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

/* solhint-disable quotes */

import "./lib/ERC721Checkpointable.sol";
import "./BleepsTokenURI.sol";
import "hardhat-deploy/solc_0.8/proxy/Proxied.sol";

contract Bleeps is ERC721Checkpointable, Proxied {
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
        _startTime = startTime;
        _initPrice = initPrice;
        _delay = delay;
        _lastPrice = lastPrice;
        init(maintainer, recipient, tokenURIContract);
    }

    function init(
        address maintainer,
        address payable recipient,
        BleepsTokenURI tokenURIContract
    ) public proxied {
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

    function mint(uint16 id, address to) external payable {
        uint256 expectedValue = _initPrice;
        uint256 timePassed = (block.timestamp - _startTime);
        if (timePassed > _delay) {
            expectedValue = _lastPrice;
        } else {
            expectedValue = _lastPrice + (_initPrice - _lastPrice) / (_delay - timePassed);
        }

        require(msg.value >= expectedValue, "NOT_ENOUGH");
        payable(msg.sender).transfer(msg.value - expectedValue);
        _recipient.transfer(expectedValue);

        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        require(!_exists(id), "ALREADY_CREATED");
        _mint(to, id);
    }
}
