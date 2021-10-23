import VM from '@ethereumjs/vm';
import {Transaction} from '@ethereumjs/tx';
import {Address, privateToAddress} from 'ethereumjs-util';
import type {Result} from '@ethersproject/abi';
import {Interface} from '@ethersproject/abi';

export class VirtualContract {
  private contractAddress: string;
  private accountAddress: string;
  private vm: VM;
  private deploymentBytecode: string;
  private interface: Interface;
  private args: any[];

  constructor(abi: any, deploymentBytecode: string, ...args: any[]) {
    this.deploymentBytecode = deploymentBytecode;
    this.args = args;
    this.vm = new VM();
    this.interface = new Interface(abi);
  }

  async init(): Promise<void> {
    if (!this.contractAddress) {
      const accountPk = Buffer.from('e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109', 'hex');
      this.accountAddress = privateToAddress(accountPk).toString();
      const tx = Transaction.fromTxData({
        value: 0,
        gasLimit: 10000000, // We assume that 10M is enough,
        gasPrice: 0,
        data: this.deploymentBytecode + (this.args.length == 0 ? '' : this.interface.encodeDeploy(this.args).slice(2)),
        nonce: 0,
      });
      tx.sign(accountPk);
      const deploymentResult = await this.vm.runTx({tx});
      if (deploymentResult.execResult.exceptionError) {
        throw deploymentResult.execResult.exceptionError;
      }
      this.contractAddress = deploymentResult.createdAddress.toString();
      console.log('vm for pure calls started');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async call(func: string, ...args: any[]): Promise<Result> {
    await this.init();
    const callResult = await this.vm.runCall({
      to: Address.fromString(this.contractAddress),
      caller: Address.fromString(this.accountAddress),
      origin: Address.fromString(this.accountAddress), // The tx.origin is also the caller here
      data: Buffer.from(this.interface.encodeFunctionData(func, args).slice(2), 'hex'),
    });
    if (callResult.execResult.exceptionError) {
      throw callResult.execResult.exceptionError;
    }
    return this.interface.decodeFunctionResult(func, callResult.execResult.returnValue);
  }
}
