// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "./ERC721Base.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IERC1271 {
    function isValidSignature(bytes calldata data, bytes calldata signature) external view returns (bytes4 magicValue);
}

interface IERC1654 {
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4 magicValue);
}

abstract contract ERC721BaseWithPermit is ERC721Base {
    using Address for address;
    using ECDSA for bytes32;

    enum SignatureType {
        DIRECT,
        EIP1654,
        EIP1271
    }
    bytes4 internal constant ERC1271_MAGICVALUE = 0x20c13b0b;
    bytes4 internal constant ERC1654_MAGICVALUE = 0x1626ba7e;

    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_FOR_ALL_TYPEHASH =
        keccak256("PermitForAll(address spender,uint256 nonce,uint256 deadline)");
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    uint256 private immutable _deploymentChainId;
    bytes32 private immutable _deploymentDomainSeparator;

    mapping(address => mapping(uint128 => uint128)) internal _nonces;

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

    function nonces(address owner, uint128 batch) external view returns (uint256 nonce) {
        nonce = uint256(batch << 128) + _nonces[owner][batch];
    }

    function permit(
        address signer,
        address spender,
        uint256 id,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature,
        SignatureType signatureType
    ) external {
        require(deadline >= block.timestamp, "PERMIT_DEADLINE_EXPIRED");

        (address owner, uint256 blockNumber) = _ownerAndBlockNumberOf(id);
        require(owner != address(0), "NONEXISTENT_TOKEN");
        require(signer == owner || _operatorsForAll[owner][signer], "UNAUTHORIZED_SIGNER");

        _requireValidPermit(signer, spender, id, deadline, nonce, signature, signatureType);

        uint128 batchId = uint128(nonce >> 128);
        uint128 batchNonce = uint128(nonce % 2**128);
        uint128 currentNonce = _nonces[signer][batchId];
        require(batchNonce == currentNonce, "INVALID_NONCE");
        _nonces[signer][batchId] = currentNonce + 1;

        _approveFor(owner, blockNumber, spender, id);
    }

    function permitForAll(
        address signer,
        address spender,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature,
        SignatureType signatureType
    ) external {
        require(deadline >= block.timestamp, "PERMIT_DEADLINE_EXPIRED");

        _requireValidPermitForAll(signer, spender, deadline, nonce, signature, signatureType);

        uint128 batchId = uint128(nonce >> 128);
        uint128 batchNonce = uint128(nonce % 2**128);
        uint128 currentNonce = _nonces[signer][batchId];
        require(batchNonce == currentNonce, "INVALID_NONCE");
        _nonces[signer][batchId] = currentNonce + 1;

        _setApprovalForAll(signer, spender, true);
    }

    // -------------------------------------------------------- INTERNAL --------------------------------------------------------------------

    function _requireValidPermit(
        address signer,
        address spender,
        uint256 id,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature,
        SignatureType signatureType
    ) internal view {
        bytes memory dataToHash = abi.encodePacked(
            "\x19\x01",
            _DOMAIN_SEPARATOR(),
            keccak256(abi.encode(PERMIT_TYPEHASH, spender, id, nonce, deadline))
        );
        return _requireValidSignature(signer, dataToHash, signature, signatureType);
    }

    function _requireValidPermitForAll(
        address signer,
        address spender,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature,
        SignatureType signatureType
    ) internal view {
        bytes memory dataToHash = abi.encodePacked(
            "\x19\x01",
            _DOMAIN_SEPARATOR(),
            keccak256(abi.encode(PERMIT_FOR_ALL_TYPEHASH, spender, nonce, deadline))
        );
        return _requireValidSignature(signer, dataToHash, signature, signatureType);
    }

    function _requireValidSignature(
        address signer,
        bytes memory dataToHash,
        bytes calldata signature,
        SignatureType signatureType
    ) internal view {
        if (signatureType == SignatureType.EIP1271) {
            require(
                IERC1271(signer).isValidSignature(dataToHash, signature) == ERC1271_MAGICVALUE,
                "SIGNATURE_1271_INVALID"
            );
        } else if (signatureType == SignatureType.EIP1654) {
            require(
                IERC1654(signer).isValidSignature(keccak256(dataToHash), signature) == ERC1654_MAGICVALUE,
                "SIGNATURE_1654_INVALID"
            );
        } else {
            address actualSigner = keccak256(dataToHash).recover(signature);
            require(signer == actualSigner, "SIGNATURE_WRONG_SIGNER");
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
