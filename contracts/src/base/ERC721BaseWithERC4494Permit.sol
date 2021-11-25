// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "./ERC721Base.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4 magicValue);
}

abstract contract ERC721BaseWithERC4494Permit is ERC721Base {
    using Address for address;
    using ECDSA for bytes32;

    bytes4 internal constant ERC1271_MAGICVALUE = 0x1626ba7e;

    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_FOR_ALL_TYPEHASH =
        keccak256("PermitForAll(address spender,uint256 nonce,uint256 deadline)");
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    uint256 private immutable _deploymentChainId;
    bytes32 private immutable _deploymentDomainSeparator;

    mapping(address => uint256) internal _userNonces;

    constructor() {
        uint256 chainId;
        //solhint-disable-next-line no-inline-assembly
        assembly {
            chainId := chainid()
        }
        _deploymentChainId = chainId;
        _deploymentDomainSeparator = _calculateDomainSeparator(chainId);
    }

    /// @dev Return the DOMAIN_SEPARATOR.
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _DOMAIN_SEPARATOR();
    }

    function nonces(uint256 id) external view virtual returns (uint256 nonce) {
        return tokenNonces(id);
    }

    function tokenNonces(uint256 id) public view returns (uint256 nonce) {
        revert("NOT_IMPLEMENTED");
    }

    function accountNnonces(address owner) external view returns (uint256 nonce) {
        return _userNonces[owner];
    }

    function permit(
        address spender,
        uint256 tokenId,
        uint256 deadline,
        bytes memory sig
    ) external {
        require(deadline >= block.timestamp, "PERMIT_DEADLINE_EXPIRED");

        (address owner, uint256 blockNumber) = _ownerAndBlockNumberOf(tokenId);
        require(owner != address(0), "NONEXISTENT_TOKEN");

        _requireValidPermit(owner, spender, tokenId, deadline, tokenNonces(tokenId), sig);

        _approveFor(owner, blockNumber, spender, tokenId);
    }

    function permitForAll(
        address signer,
        address spender,
        uint256 deadline,
        bytes memory sig
    ) external {
        require(deadline >= block.timestamp, "PERMIT_DEADLINE_EXPIRED");

        _requireValidPermitForAll(signer, spender, deadline, _userNonces[signer]++, sig);

        _setApprovalForAll(signer, spender, true);
    }

    // -------------------------------------------------------- INTERNAL --------------------------------------------------------------------

    function _requireValidPermit(
        address signer,
        address spender,
        uint256 id,
        uint256 deadline,
        uint256 nonce,
        bytes memory sig
    ) internal view {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                _DOMAIN_SEPARATOR(),
                keccak256(abi.encode(PERMIT_TYPEHASH, spender, id, nonce, deadline))
            )
        );
        return _requireValidSignature(signer, digest, sig);
    }

    function _requireValidPermitForAll(
        address signer,
        address spender,
        uint256 deadline,
        uint256 nonce,
        bytes memory sig
    ) internal view {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                _DOMAIN_SEPARATOR(),
                keccak256(abi.encode(PERMIT_FOR_ALL_TYPEHASH, spender, nonce, deadline))
            )
        );
        _requireValidSignature(signer, digest, sig);
    }

    function _requireValidSignature(
        address signer,
        bytes32 digest,
        bytes memory sig
    ) internal view {
        if (signer.isContract()) {
            require(
                IERC1271(signer).isValidSignature(digest, sig) == ERC1271_MAGICVALUE,
                "SIGNATURE_1271_NOT_MATCHING"
            );
        } else {
            address recoveredAddress = digest.recover(sig);
            require(recoveredAddress != address(0), "SIGNATURE_INVALID");
            require(recoveredAddress == signer, "SIGNATURE_WRONG_SIGNER");
        }
    }

    /// @dev Return the DOMAIN_SEPARATOR.
    function _DOMAIN_SEPARATOR() internal view returns (bytes32) {
        uint256 chainId;
        //solhint-disable-next-line no-inline-assembly
        assembly {
            chainId := chainid()
        }

        // in case a fork happen, to support the chain that had to change its chainId,, we compute the domain operator
        return chainId == _deploymentChainId ? _deploymentDomainSeparator : _calculateDomainSeparator(chainId);
    }

    /// @dev Calculate the DOMAIN_SEPARATOR.
    function _calculateDomainSeparator(uint256 chainId) private view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name())), chainId, address(this)));
    }
}
