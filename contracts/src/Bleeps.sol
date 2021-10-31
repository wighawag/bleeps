// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "./base/MinterMaintainerRoles.sol";
import "./base/ERC721Checkpointable.sol";

import "./interfaces/ITokenURI.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Bleeps is IERC721, ERC721Checkpointable, MinterMaintainerRoles {
    event TokenURIContractSet(ITokenURI newTokenURIContract);

    /// @notice the contract that actually generate the sound (and all metadata via the a data: uri as tokenURI)
    ITokenURI public tokenURIContract;

    constructor(
        address initialMaintainer,
        address initialMinterAdmin,
        ITokenURI initialTokenURIContract
    ) MinterMaintainerRoles(initialMaintainer, initialMinterAdmin) {
        tokenURIContract = initialTokenURIContract;
        emit TokenURIContractSet(initialTokenURIContract);
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

    function owners(uint256[] calldata ids) external view returns (address[] memory addresses) {
        addresses = new address[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            addresses[i] = address(uint160(_owners[id]));
        }
    }

    /// @notice disable checkpointing overhead
    /// This can be used if the governance system can switch to use ownerAndLastTransferBlockNumberOf instead of checkpoints
    function disableTheUseOfCheckpoints() external {
        require(msg.sender == maintainer, "NOT_AUTHORIZED");
        _useCheckpoints = false;
        // TODO event
        // TODO special role ?
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
