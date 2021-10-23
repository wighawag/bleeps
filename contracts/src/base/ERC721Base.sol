// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

abstract contract ERC721Base is IERC165, IERC721 {
    using Address for address;
    using EnumerableSet for EnumerableSet.UintSet;

    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant ERC165ID = 0x01ffc9a7;

    uint256 internal constant OPERATOR_FLAG = (2**255);

    mapping(uint256 => uint256) internal _owners;
    mapping(address => EnumerableSet.UintSet) internal _holderTokens;
    mapping(address => mapping(address => bool)) internal _operatorsForAll;
    mapping(uint256 => address) internal _operators;

    /// @notice Count NFTs tracked by this contract
    /// @return A count of valid NFTs tracked by this contract, where each one of
    ///  them has an assigned and queryable owner not equal to the zero address
    function totalSupply() external pure returns (uint256) {
        return 2**160 - 1; // do not count token with id zero whose owner would otherwise be the zero address
    }

    /// @notice Enumerate valid NFTs
    /// @dev Throws if `index` >= `totalSupply()`.
    /// @param index A counter less than `totalSupply()`
    /// @return The token identifier for the `_index`th NFT,
    ///  (sort order not specified)
    function tokenByIndex(uint256 index) external pure returns (uint256) {
        require(index < 2**160 - 1, "NONEXISTENT_TOKEN");
        return index + 1; // skip zero as we do not count token with id zero whose owner would otherwise be the zero address
    }

    /// @notice Enumerate NFTs assigned to an owner
    /// @dev Throws if `index` >= `balanceOf(owner)` or if
    ///  `owner` is the zero address, representing invalid NFTs.
    /// @param owner An address where we are interested in NFTs owned by them
    /// @param index A counter less than `balanceOf(owner)`
    /// @return The token identifier for the `index`th NFT assigned to `owner`,
    ///   (sort order not specified)
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256) {
        require(owner != address(0), "ZERO_ADDRESS_OWNER");
        return _holderTokens[owner].at(index);
    }

    /// @notice Approve an operator to spend tokens on the senders behalf.
    /// @param operator The address receiving the approval.
    /// @param id The id of the token.
    function approve(address operator, uint256 id) external override {
        address owner = _ownerOf(id);
        require(owner != address(0), "NONEXISTENT_TOKEN");
        require(owner == msg.sender || _operatorsForAll[owner][msg.sender], "UNAUTHORIZED_APPROVAL");
        _approveFor(owner, operator, id);
    }

    /// @notice Transfer a token between 2 addresses.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param id The id of the token.
    function transferFrom(
        address from,
        address to,
        uint256 id
    ) external override {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        (id);
        require(owner != address(0), "NONEXISTENT_TOKEN");
        require(owner == from, "NOT_OWNER");
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        if (msg.sender != from) {
            require(
                _operatorsForAll[from][msg.sender] || (operatorEnabled && _operators[id] == msg.sender),
                "UNAUTHORIZED_TRANSFER"
            );
        }
        _transferFrom(from, to, id);
    }

    /// @notice Transfer a token between 2 addresses letting the receiver know of the transfer.
    /// @param from The send of the token.
    /// @param to The recipient of the token.
    /// @param id The id of the token.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) external override {
        safeTransferFrom(from, to, id, "");
    }

    /// @notice Set the approval for an operator to manage all the tokens of the sender.
    /// @param operator The address receiving the approval.
    /// @param approved The determination of the approval.
    function setApprovalForAll(address operator, bool approved) external override {
        _setApprovalForAll(msg.sender, operator, approved);
    }

    /// @notice Get the number of tokens owned by an address.
    /// @param owner The address to look for.
    /// @return balance The number of tokens owned by the address.
    function balanceOf(address owner) external view override returns (uint256 balance) {
        require(owner != address(0), "ZERO_ADDRESS_OWNER");
        balance = _holderTokens[owner].length();
    }

    /// @notice Get the owner of a token.
    /// @param id The id of the token.
    /// @return owner The address of the token owner.
    function ownerOf(uint256 id) external view override returns (address owner) {
        owner = _ownerOf(id);
        require(owner != address(0), "NONEXISTENT_TOKEN");
    }

    /// @notice Get the approved operator for a specific token.
    /// @param id The id of the token.
    /// @return The address of the operator.
    function getApproved(uint256 id) external view override returns (address) {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "NONEXISTENT_TOKEN");
        if (operatorEnabled) {
            return _operators[id];
        } else {
            return address(0);
        }
    }

    /// @notice Check if the sender approved the operator.
    /// @param owner The address of the owner.
    /// @param operator The address of the operator.
    /// @return isOperator The status of the approval.
    function isApprovedForAll(address owner, address operator) external view override returns (bool isOperator) {
        return _operatorsForAll[owner][operator];
    }

    /// @notice Transfer a token between 2 addresses letting the receiver knows of the transfer.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param id The id of the token.
    /// @param data Additional data.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes memory data
    ) public override {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "NONEXISTENT_TOKEN");
        require(owner == from, "NOT_OWNER");
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        if (msg.sender != from) {
            require(
                (operatorEnabled && _operators[id] == msg.sender) || _operatorsForAll[from][msg.sender],
                "UNAUTHORIZED_TRANSFER"
            );
        }
        _safeTransferFrom(from, to, id, data);
    }

    /// @notice Check if the contract supports an interface.
    /// 0x01ffc9a7 is ERC165.
    /// 0x80ac58cd is ERC721
    /// 0x5b5e139f is for ERC721 metadata
    /// 0x780e9d63 is for ERC721 enumerable
    /// @param id The id of the interface.
    /// @return Whether the interface is supported.
    function supportsInterface(bytes4 id) public pure virtual override returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd || id == 0x5b5e139f || id == 0x780e9d63;
    }

    function _safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes memory data
    ) internal {
        _transferFrom(from, to, id);
        if (to.isContract()) {
            require(_checkOnERC721Received(msg.sender, from, to, id, data), "ERC721_TRANSFER_REJECTED");
        }
    }

    function _transferFrom(
        address from,
        address to,
        uint256 id
    ) internal {
        _holderTokens[to].add(id);
        _owners[id] = uint256(uint160(to));
        emit Transfer(from, to, id);
    }

    /// @dev See approve.
    function _approveFor(
        address owner,
        address operator,
        uint256 id
    ) internal {
        if (operator == address(0)) {
            _owners[id] = uint256(uint160(owner));
        } else {
            _owners[id] = OPERATOR_FLAG | uint256(uint160(owner));
            _operators[id] = operator;
        }
        emit Approval(owner, operator, id);
    }

    /// @dev See setApprovalForAll.
    function _setApprovalForAll(
        address sender,
        address operator,
        bool approved
    ) internal {
        _operatorsForAll[sender][operator] = approved;

        emit ApprovalForAll(sender, operator, approved);
    }

    /// @dev Check if receiving contract accepts erc721 transfers.
    /// @param operator The address of the operator.
    /// @param from The from address, may be different from msg.sender.
    /// @param to The adddress we want to transfer to.
    /// @param id The id of the token we would like to transfer.
    /// @param _data Any additional data to send with the transfer.
    /// @return Whether the expected value of 0x150b7a02 is returned.
    function _checkOnERC721Received(
        address operator,
        address from,
        address to,
        uint256 id,
        bytes memory _data
    ) internal returns (bool) {
        bytes4 retval = IERC721Receiver(to).onERC721Received(operator, from, id, _data);
        return (retval == ERC721_RECEIVED);
    }

    /// @dev See ownerOf
    function _ownerOf(uint256 id) internal view returns (address owner) {
        return address(uint160(_owners[id]));
    }

    /// @dev Get the owner and operatorEnabled status of a token.
    /// @param id The token to query.
    /// @return owner The owner of the token.
    /// @return operatorEnabled Whether or not operators are enabled for this token.
    function _ownerAndOperatorEnabledOf(uint256 id) internal view returns (address owner, bool operatorEnabled) {
        uint256 data = _owners[id];
        owner = address(uint160(data));
        if (owner == address(0) && id < 2**160) {
            owner = address(uint160(id));
        }
        operatorEnabled = (data & OPERATOR_FLAG) == OPERATOR_FLAG;
    }
}
