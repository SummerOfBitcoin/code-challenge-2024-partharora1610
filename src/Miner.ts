import { Block } from "./Block";
import { Mempoll } from "./Mempoll";
import { Tx } from "./Tx";
import { BLOCK_HEADER_SIZE, COINBASE_TX_SIZE } from "./constants";
import fs from "fs";
import { createHash } from "crypto";

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

    const res = this.fillBlock(
      maxBlockSize - BLOCK_HEADER_SIZE - COINBASE_TX_SIZE,
      tx,
      fees,
      weights
    );

    const wTxid = res.map((tx) => tx.getWTxID()); // witness root hash
    const witnessCommitment = calculateWitnessCommitment(wTxid);

    const coinbaseTx = Tx.createCoinbaseTransaction(witnessCommitment);

    const txid = res.map((tx) => tx.getTxID().split("").reverse().join(""));

    const hashBuf = txid.map((tx) => Buffer.from(tx));
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
      // console.error("Error writing to output.txt:", err);
    } else {
    }
  });
}
export const generateMerkleRoot = (txids) => {
  if (txids.length === 0) return null;

  let level = txids.map((txid) => Buffer.from(txid).reverse().toString("hex"));

  while (level.length > 1) {
    const nextLevel = [];

    for (let i = 0; i < level.length; i += 2) {
      let pairHash;
      if (i + 1 === level.length) {
        pairHash = hash25(level[i] + level[i]);
      } else {
        pairHash = hash25(level[i] + level[i + 1]);
      }
      nextLevel.push(pairHash);
    }

    level = nextLevel;
  }

  return level[0];
};

export const hash25 = (input) => {
  const h1 = createHash("sha256").update(Buffer.from(input, "hex")).digest();
  return createHash("sha256").update(h1).digest("hex");
};

export const WITNESS_RESERVED_VALUE = Buffer.from(
  "0000000000000000000000000000000000000000000000000000000000000000",
  "hex"
);

const calculateWitnessCommitment = (wtxids) => {
  const witnessRoot = generateMerkleRoot(wtxids);
  const witnessReservedValue = WITNESS_RESERVED_VALUE.toString("hex");
  return hash25(witnessRoot + witnessReservedValue);
};
