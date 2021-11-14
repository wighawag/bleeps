// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "../base/Roles.sol";
import "../base/ERC721Checkpointable.sol";

import "../interfaces/ITokenURI.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../base/WithSupportForOpenSeaProxies.sol";

contract Bleeps is IERC721, WithSupportForOpenSeaProxies, ERC721Checkpointable, Roles {
    event TokenURIContractSet(ITokenURI newTokenURIContract);
    event CheckpointingDisablerSet(address newCheckpointingDisabler);
    event CheckpointingDisabled();

    /// @notice the contract that actually generate the sound (and all metadata via the a data: uri via tokenURI call).
    ITokenURI public tokenURIContract;

    /// @dev recipient of royalty, default to zero.
    address internal _royaltyRecipient;

    /// @dev share of royalty, default to zero.
    uint256 internal _royaltyPer10Thousands;

    /// @dev address that is able to switch off the use of checkpointing, this will make token transfers much cheaper in term of gas, but require the design of a new governance system.
    address public checkpointingDisabler;

    /// @dev Create the Bleeps contract
    /// @param openseaProxyRegistry allow Bleeps to be sold on opensea without prior approval tx as long as the user have already an opensea proxy.
    /// @param initialTokenURIAdmin admin able to update the tokenURI contract.
    /// @param initialRoyaltyAdmin admin able to update the royalty recipient and rates.
    /// @param initialMinterAdmin admin able to set the minter contract.
    /// @param initialGuardian guardian able to immortalize rules
    /// @param initialTokenURIContract initial tokenURI contract that generate the metadata including the wav file.
    /// @param initialCheckpointingDisabler admin able to update the royalty recipient and rates.
    constructor(
        address openseaProxyRegistry,
        address initialTokenURIAdmin,
        address initialRoyaltyAdmin,
        address initialMinterAdmin,
        address initialGuardian,
        ITokenURI initialTokenURIContract,
        address initialCheckpointingDisabler
    )
        WithSupportForOpenSeaProxies(openseaProxyRegistry)
        Roles(initialTokenURIAdmin, initialRoyaltyAdmin, initialMinterAdmin, initialGuardian)
    {
        tokenURIContract = initialTokenURIContract;
        emit TokenURIContractSet(initialTokenURIContract);
        checkpointingDisabler = initialCheckpointingDisabler;
        emit CheckpointingDisablerSet(initialCheckpointingDisabler);
    }

    /// @notice A descriptive name for a collection of NFTs in this contract.
    function name() public pure override returns (string memory) {
        return "Bleeps";
    }

    /// @notice An abbreviated name for NFTs in this contract.
    function symbol() external pure returns (string memory) {
        return "BLEEP";
    }

    /// @notice Returns the Uniform Resource Identifier (URI) for the token collection.
    function contractURI() external view returns (string memory) {
        return tokenURIContract.contractURI();
    }

    /// @notice Returns the Uniform Resource Identifier (URI) for token `id`.
    function tokenURI(uint256 id) external view returns (string memory) {
        return tokenURIContract.tokenURI(id);
    }

    /// @notice set a new tokenURI contract, that generate the metadata including the wav file, Can only be set by the `tokenURIAdmin`.
    /// @param newTokenURIContract The address of the new tokenURI contract.
    function setTokenURIContract(ITokenURI newTokenURIContract) external {
        require(msg.sender == tokenURIAdmin, "NOT_AUTHORIZED");
        tokenURIContract = newTokenURIContract;
        emit TokenURIContractSet(newTokenURIContract);
    }

    /// @notice give the list of owners for the list of ids given.
    /// @param ids The list if token ids to check.
    /// @return addresses The list of addresses, corresponding to the list of ids.
    function owners(uint256[] calldata ids) external view returns (address[] memory addresses) {
        addresses = new address[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            addresses[i] = address(uint160(_owners[id]));
        }
    }

    /// @notice Check if the sender approved the operator.
    /// @param owner The address of the owner.
    /// @param operator The address of the operator.
    /// @return isOperator The status of the approval.
    function isApprovedForAll(address owner, address operator)
        public
        view
        virtual
        override(ERC721Base, IERC721)
        returns (bool isOperator)
    {
        return super.isApprovedForAll(owner, operator) || _isOpenSeaProxy(owner, operator);
    }

    /// @notice Check if the contract supports an interface.
    /// @param id The id of the interface.
    /// @return Whether the interface is supported.
    function supportsInterface(bytes4 id) public pure virtual override(ERC721Base, IERC165) returns (bool) {
        return super.supportsInterface(id) || id == 0x2a55205a; /// 0x2a55205a is ERC2981 (royalty standard)
    }

    /// @notice Called with the sale price to determine how much royalty is owed and to whom.
    /// @param id - the token queried for royalty information.
    /// @param salePrice - the sale price of the token specified by id.
    /// @return receiver - address of who should be sent the royalty payment.
    /// @return royaltyAmount - the royalty payment amount for salePrice.
    function royaltyInfo(uint256 id, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        receiver = _royaltyRecipient;
        royaltyAmount = (salePrice * _royaltyPer10Thousands) / 10000;
    }

    /// @notice set a new royalty recipient and rate, Can only be set by the `royaltyAdmin`.
    /// @param newRecipient the address that should receive the royalty proceeds.
    /// @param royaltyPer10Thousands the share of the salePrice (in 1/10000) given to the recipient.
    function setRoyaltyParameters(address newRecipient, uint256 royaltyPer10Thousands) external {
        require(msg.sender == royaltyAdmin, "NOT_AUTHORIZED");
        // require(royaltyPer10Thousands <= 50, "ROYALTY_TOO_HIGH"); ?
        _royaltyRecipient = newRecipient;
        _royaltyPer10Thousands = royaltyPer10Thousands;
    }

    /// @notice disable checkpointing overhead
    /// This can be used if the governance system can switch to use ownerAndLastTransferBlockNumberOf instead of checkpoints
    function disableTheUseOfCheckpoints() external {
        require(msg.sender == checkpointingDisabler, "NOT_AUTHORIZED");
        _useCheckpoints = false;
        checkpointingDisabler = address(0);
        emit CheckpointingDisablerSet(address(0));
        emit CheckpointingDisabled();
    }

    /// @notice update the address that can disable the use of checkpinting, can be used to disable it entirely.
    /// @param newCheckpointingDisabler new address that can disable the use of checkpointing. can be the zero address to remove the ability to change.
    function setCheckpointingDisabler(address newCheckpointingDisabler) external {
        require(msg.sender == checkpointingDisabler, "NOT_AUTHORIZED");
        checkpointingDisabler = newCheckpointingDisabler;
        emit CheckpointingDisablerSet(newCheckpointingDisabler);
    }

    /// @notice mint one of bleep if not already minted. Can only be called by `minter`.
    /// @param id bleep id which represent a pair of (note, instrument).
    /// @param to address that will receive the Bleep.
    function mint(uint16 id, address to) external {
        require(msg.sender == minter, "ONLY_MINTER_ALLOWED");
        require(id < 1024, "INVALID_SOUND");

        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        address owner = _ownerOf(id);
        require(owner == address(0), "ALREADY_CREATED");
        _safeTransferFrom(address(0), to, id, "");
    }

    /// @notice gives the note and instrument for a particular Bleep id.
    /// @param id bleep id which represent a pair of (note, instrument).
    /// @return note the note index (0 to 63) starting from C2 to D#7
    /// @return instrument the instrument index (0 to 16). At launch there is only 9 instrument but the DAO could add more (up to 16 in total).
    function sound(uint256 id) external pure returns (uint8 note, uint8 instrument) {
        note = uint8(id & 0x3F);
        instrument = uint8(uint256(id >> 6) & 0x0F);
    }
}
