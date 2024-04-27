import fs from "fs";
import { Block } from "./Block";
import { Mempoll } from "./Mempoll";
import { Tx } from "./Tx";
import { BLOCK_HEADER_SIZE, COINBASE_TX_SIZE } from "./constants";
import { createHash } from "crypto";
import { hash256 } from "./util/Hash256";
import {
  calculateWitnessCommitment,
  generateMerkleRoot,
} from "./util/MerkleUtils";

export class Miner {
  public mempoll: Mempoll;
  public dp;
  public filled = 4000000;
  public feesCollected = 0;

  constructor() {
    this.mempoll = new Mempoll();
    this.dp = new Map();
  }

  public async mineBlock() {
    let maxBlockSize = 4000000;
    const tx = this.mempoll.txs;
    const fees = this.mempoll.feesArrayVector;
    const weights = this.mempoll.txWeightVector;

    const res = this.fillBlock(maxBlockSize - 2000, tx, fees, weights);

    const wTxid = res.map((tx) => tx.getWTxID().reverse().toString("hex"));

    wTxid.unshift(
      "0000000000000000000000000000000000000000000000000000000000000000"
    );

    const witnessCommitment = calculateWitnessCommitment(wTxid);

    const coinbaseTx = Tx.createCoinbaseTransaction(witnessCommitment);

    const coinbaseId = hash256(Buffer.from(coinbaseTx));

    const txid = res.map((tx) => tx.getTxID().reverse().toString("hex"));
    txid.unshift(coinbaseId.toString("hex"));

    const hashBuf = txid.map((tx) => Buffer.from(tx, "hex"));

    const mr = generateMerkleRoot(hashBuf);

    /**
     * version
     * prevBlock
     * merkleRoot
     * timestamp
     * bits
     * nonce
     */
    const block = Block.mineBlock(mr);

    writeToOutputFile(
      block,
      coinbaseTx,
      txid.map((tx) => tx)
    );

    console.log(this.filled);
    console.log(this.feesCollected);
  }

  public fillBlock(
    maxBlockSize: number,
    tx: Tx[],
    fees: bigint[],
    weights: number[]
  ): Tx[] {
    const feePerWeight = [];

    for (let i = 0; i < tx.length; i++) {
      feePerWeight.push(Number(fees[i]) / weights[i]);
    }

    let currentBlockSize = 0;

    const selectedTxs = [];
    const sortedIndices = feePerWeight
      .map((_, i) => i)
      .sort((a, b) => feePerWeight[b] - feePerWeight[a]);

    for (const index of sortedIndices) {
      const txSize = weights[index];

      if (currentBlockSize + txSize > maxBlockSize) {
        break;
      }

      const valid = tx[index].verify();

      if (!valid) {
        continue;
      }

      selectedTxs.push(tx[index]);
      currentBlockSize += txSize;

      this.feesCollected += Number(fees[index]);
      this.filled -= txSize;
    }

    return selectedTxs;
  }
}

function writeToOutputFile(blockHeader, coinbaseTxSerialized, transactionIds) {
  const outputData = `${blockHeader}\n${coinbaseTxSerialized}\n${transactionIds.join(
    "\n"
  )}`;

  fs.writeFile("output.txt", outputData, (err) => {
    if (err) {
      console.error(err);
    } else {
    }
  });
}
