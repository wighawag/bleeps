// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

/* solhint-disable quotes */

import "./base/ERC721BaseWithPermit.sol";
import "./BleepsTokenURI.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Bleeps is ERC721BaseWithPermit {
    // _maintainer only roles is to update the tokenURI contract, useful in case there are any wav generation bug to fix or improvement to make, the plan is to revoke that role when the project has been time-tested
    address internal _maintainer;
    address payable internal _recipient;
    BleepsTokenURI public tokenURIContract;

    uint256 internal immutable _startTime;
    uint256 internal immutable _initPrice;
    uint256 internal immutable _delay;
    uint256 internal immutable _lastPrice;

    IERC721 internal immutable _mandalas;

    constructor(
        uint256 initPrice,
        uint256 delay,
        uint256 lastPrice,
        uint256 startTime,
        IERC721 mandalas,
        address maintainer,
        address payable recipient,
        BleepsTokenURI initialTokenURIContract
    ) {
        _initPrice = initPrice;
        _delay = delay;
        _lastPrice = lastPrice;
        _startTime = startTime;
        _mandalas = mandalas;
        _maintainer = maintainer;
        _recipient = recipient;
        tokenURIContract = initialTokenURIContract;
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

    /// @notice Count NFTs tracked by this contract
    /// @return A count of valid NFTs tracked by this contract, where each one of
    ///  them has an assigned and queryable owner not equal to the zero address
    function totalSupply() external pure returns (uint256) {
        return 512;
    }

    /// @notice A descriptive name for a collection of NFTs in this contract
    function name() public pure override returns (string memory) {
        return "Bleeps";
    }

    /// @notice An abbreviated name for NFTs in this contract
    function symbol() external pure returns (string memory) {
        return "BLEEP";
    }

    function tokenURI(uint256 id) external view returns (string memory) {
        return tokenURIContract.wav(uint16(id));
    }

    function setTokenURIContract(BleepsTokenURI newTokenURIContract) external {
        require(msg.sender == _maintainer, "NOT_AUTHORIZED");
        tokenURIContract = newTokenURIContract;
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
            addresses[i] = address(uint160(_owners[id]));
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

            (bool success, bytes memory returnData) = address(_mandalas).staticcall(
                abi.encodeWithSignature("balanceOf(address)", msg.sender)
            );
            uint256 numMandalas = success && returnData.length > 0 ? abi.decode(returnData, (uint256)) : 0;
            if (numMandalas > 0) {
                expectedValue = (expectedValue * 8) / 10;
            }
            require(msg.value >= expectedValue, "NOT_ENOUGH");
            payable(msg.sender).transfer(msg.value - expectedValue);
            _recipient.transfer(expectedValue);
        }

        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        address owner = _ownerOf(id);
        require(owner == address(0), "ALREADY_CREATED");
        _safeTransferFrom(address(0), to, id, "");
    }
}
