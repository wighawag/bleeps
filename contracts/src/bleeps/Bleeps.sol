// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "../base/Roles.sol";
import "../base/ERC721Checkpointable.sol";

import "./ITokenURI.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../base/WithSupportForOpenSeaProxies.sol";

contract Bleeps is IERC721, WithSupportForOpenSeaProxies, ERC721Checkpointable, Roles {
    event TokenURIContractSet(ITokenURI newTokenURIContract);

    /// @notice the contract that actually generate the sound (and all metadata via the a data: uri as tokenURI)
    ITokenURI public tokenURIContract;

    address internal _royaltyRecipient;
    uint256 internal _royaltyPer10Thousands;

    address internal _checkpointingDisabler;

    constructor(
        address openseaProxyRegistry,
        address initialTokenURIAdmin,
        address initialRoyaltyAdmin,
        address initialMinterAdmin,
        ITokenURI initialTokenURIContract,
        address checkpointingDisabler
    )
        WithSupportForOpenSeaProxies(openseaProxyRegistry)
        Roles(initialTokenURIAdmin, initialRoyaltyAdmin, initialMinterAdmin)
    {
        tokenURIContract = initialTokenURIContract;
        emit TokenURIContractSet(initialTokenURIContract);
        _checkpointingDisabler = checkpointingDisabler;
    }

    /// @notice A descriptive name for a collection of NFTs in this contract.
    function name() public pure override returns (string memory) {
        return "Bleeps";
    }

    /// @notice An abbreviated name for NFTs in this contract.
    function symbol() external pure returns (string memory) {
        return "BLEEP";
    }

    function contractURI() external view returns (string memory) {
        return tokenURIContract.contractURI();
    }

    /// @notice Returns the Uniform Resource Identifier (URI) for token `id`.
    function tokenURI(uint256 id) external view returns (string memory) {
        return tokenURIContract.tokenURI(id);
    }

    function setTokenURIContract(ITokenURI newTokenURIContract) external {
        require(msg.sender == tokenURIAdmin, "NOT_AUTHORIZED");
        tokenURIContract = newTokenURIContract;
        emit TokenURIContractSet(newTokenURIContract);
    }

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

    /// @notice Called with the sale price to determine how much royalty
    //          is owed and to whom.
    /// @param id - the token queried for royalty information
    /// @param salePrice - the sale price of the token specified by id
    /// @return receiver - address of who should be sent the royalty payment
    /// @return royaltyAmount - the royalty payment amount for salePrice
    function royaltyInfo(uint256 id, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        receiver = _royaltyRecipient;
        royaltyAmount = (salePrice * _royaltyPer10Thousands) / 10000;
    }

    function setRoyaltyParameters(address newRecipient, uint256 royaltyPer10Thousands) external {
        require(msg.sender == royaltyAdmin, "NOT_AUTHORIZED");
        // require(royaltyPer10Thousands <= 50, "ROYALTY_TOO_HIGH"); ?
        _royaltyRecipient = newRecipient;
        _royaltyPer10Thousands = royaltyPer10Thousands;
    }

    /// @notice disable checkpointing overhead
    /// This can be used if the governance system can switch to use ownerAndLastTransferBlockNumberOf instead of checkpoints
    function disableTheUseOfCheckpoints() external {
        require(msg.sender == _checkpointingDisabler, "NOT_AUTHORIZED");
        _useCheckpoints = false;
    }

    function mint(uint16 id, address to) external payable {
        require(msg.sender == minter, "ONLY_MINTER_ALLOWED");
        require(id < 1024, "INVALID_SOUND");

        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(to != address(this), "NOT_TO_THIS");
        address owner = _ownerOf(id);
        require(owner == address(0), "ALREADY_CREATED");
        _safeTransferFrom(address(0), to, id, "");
    }

    function sound(uint256 id) external pure returns (uint8 note, uint8 instrument) {
        note = uint8(id & 0x3F);
        instrument = uint8(uint256(id >> 6) & 0x0F);
    }
}
