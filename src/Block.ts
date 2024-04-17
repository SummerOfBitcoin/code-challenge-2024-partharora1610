import { writeBytesReverse } from "./util/BufferUtil";
import { hash256 } from "./util/Hash256";
import { bigFromBufLE } from "./util/BigIntUtil";
import { Readable } from "stream";

const difficulty = Buffer.from(
  "0000ffff00000000000000000000000000000000000000000000000000000000",
  "hex"
);

export class Block {
  public static parse(stream: Readable): Block {
    const version = bigFromBufLE(stream.read(4));

    const prevBlock = stream.read(32).reverse();
    const merkleRoot = stream.read(32).reverse();
    const timestamp = bigFromBufLE(stream.read(4));
    const bits = stream.read(4).reverse();
    const nonce = stream.read(4).reverse();
    return new Block(version, prevBlock, merkleRoot, timestamp, bits, nonce);
  }

  public version: bigint;
  public prevBlock: Buffer;
  public merkleRoot: Buffer;
  public timestamp: bigint;
  public bits: Buffer;
  public nonce: Buffer;

  /**
   * Represents a Block
   * @param version
   * @param prevBlock
   * @param merkleRoot
   * @param timestamp
   * @param bits
   * @param nonce
   */
  constructor(
    version: bigint,
    prevBlock: Buffer,
    merkleRoot: Buffer,
    timestamp: bigint,
    bits: Buffer,
    nonce: Buffer
  ) {
    this.version = version;
    this.prevBlock = prevBlock;
    this.merkleRoot = merkleRoot;
    this.timestamp = timestamp;
    this.bits = bits;
    this.nonce = nonce;
  }

  toString() {
    return `Block:this.version=${this.version},this.prevBlock=${this.prevBlock},this.merkleRoot=${this.merkleRoot},this.timestamp=${this.timestamp},this.bits=${this.bits},this.nonce=${this.nonce}`;
  }

  public static mineBlock(merkleRoot: Buffer) {
    let nonce = 0;

    while (true) {
      const block = createBlock(merkleRoot.toString("hex"), nonce);
      const hash = hash256(Buffer.from(block, "hex")).reverse();

      if (difficulty.compare(hash) > 0) {
        return block;
      }

      nonce++;
    }
  }
}

function createBlock(merkle_root, nonce) {
  let serialize = "";
  serialize += "11000000";
  serialize += (0).toString(16).padStart(64, "0");
  serialize += merkle_root;
  const Time = Math.floor(Date.now() / 1000);
  serialize += Time.toString(16)
    .padStart(8, "0")
    .match(/../g)
    .reverse()
    .join("");
  serialize += "ffff001f";
  serialize += nonce.toString(16).padStart(8, "0");

  return serialize;
}

// 136156
// 19877820
