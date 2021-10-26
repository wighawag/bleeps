import {EIP712SignerFactory} from '.';

// bytes32 public constant PERMIT_TYPEHASH =
//         keccak256("Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)");
export const PermitSignerFactory = new EIP712SignerFactory(
  {
    name: 'Bleeps',
    chainId: 0,
  },
  {
    Permit: [
      {
        name: 'spender',
        type: 'address',
      },
      {
        name: 'tokenId',
        type: 'uint256',
      },
      {
        name: 'nonce',
        type: 'uint256',
      },
      {
        name: 'deadline',
        type: 'uint256',
      },
    ],
  }
);

// bytes32 public constant PERMIT_FOR_ALL_TYPEHASH =
//         keccak256("PermitForAll(address spender,uint256 nonce,uint256 deadline)");
export const PermitForAllSignerFactory = new EIP712SignerFactory(
  {
    name: 'Bleeps',
    chainId: 0,
  },
  {
    PermitForAll: [
      {
        name: 'spender',
        type: 'address',
      },
      {
        name: 'nonce',
        type: 'uint256',
      },
      {
        name: 'deadline',
        type: 'uint256',
      },
    ],
  }
);
