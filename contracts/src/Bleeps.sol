// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "./base/ERC721BaseWithPermit.sol";
import "./interfaces/ITokenURI.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Bleeps is IERC721, ERC721BaseWithPermit {
    event TokenURIContractSet(ITokenURI newTokenURIContract);
    event MaintainerSet(address newMaintainer);
    event MinterAdminSet(address newMinterAdmin);
    event MinterSet(address newMinter);

    /// @notice maintainer can update the tokenURI contract, this is intended to be relinquished once the tokenURI has been heavily tested in the wild and that no modification are needed.
    address public maintainer;

    /// @notice minterAdmin can update the minter. At the time being there is 576 Bleeps but there is space for extra instrument and the upper limit is 1024.
    /// could be given to the DAO later so instrument can be added, the sale of these instrument sound could benenfit the DAO too and add new members.
    address public minterAdmin;

    /// @notice address allowed to mint, allow the sale contract to be separated from the token contract that can focus on the core logic
    /// Once all 1024 potential bleeps (there could be less, at minimum there are 576 bleeps) are minted, no minter can mint anymore
    address public minter;

    /// @notice the contract that actually generate the sound (and all metadata via the a data: uri as tokenURI)
    ITokenURI public tokenURIContract;

    constructor(
        address initialMaintainer,
        address initialMinterAdmin,
        ITokenURI initialTokenURIContract
    ) {
        maintainer = initialMaintainer;
        minterAdmin = initialMinterAdmin;
        tokenURIContract = initialTokenURIContract;
        emit TokenURIContractSet(initialTokenURIContract);
        emit MaintainerSet(initialMaintainer);
        emit MinterAdminSet(initialMinterAdmin);
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
        require(msg.sender == maintainer, "NOT_AUTHORIZED");
        tokenURIContract = newTokenURIContract;
        emit TokenURIContractSet(newTokenURIContract);
    }

    function setMaintainer(address newMaintainer) external {
        require(msg.sender == maintainer, "NOT_AUTHORIZED");
        maintainer = newMaintainer;
        emit MaintainerSet(newMaintainer);
    }

    // TODO remove (used by ERC721Checkpointable for disabling it)
    // function disableTheUseOfCheckpoints() external {
    //     require(msg.sender == maintainer, "NOT_AUTHORIZED");
    //     _useCheckpoints = false;
    //     // TODO event
    //     // TODO special role ?
    // }

    function setMinter(address newMinter) external {
        require(msg.sender == minterAdmin, "NOT_AUTHORIZED");
        minter = newMinter;
        emit MinterSet(newMinter);
    }

    function setMinterAdmin(address newMinterAdmin) external {
        require(msg.sender == minterAdmin, "NOT_AUTHORIZED");
        minterAdmin = newMinterAdmin;
        emit MinterAdminSet(newMinterAdmin);
    }

    function owners(uint256[] calldata ids) external view returns (address[] memory addresses) {
        addresses = new address[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            addresses[i] = address(uint160(_owners[id]));
        }
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
