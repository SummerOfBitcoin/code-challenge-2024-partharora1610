import { writeBytesReverse, bufToStream } from "./util/BufferUtil";
import { hash256 } from "./util/Hash256";
import { bigFromBufLE } from "./util/BigIntUtil";
import { Readable } from "stream";
import { hash25 } from "./Miner";
import { createHash } from "crypto";

const difficulty = Buffer.from(
  "0000ffff00000000000000000000000000000000000000000000000000000000",
  "hex"
);

export class Block {
  public static parse(stream: Readable): Block {
    const version = bigFromBufLE(stream.read(4));

    const prevBlock = stream.read(32).reverse(); // convert to RPC byte order
    const merkleRoot = stream.read(32).reverse(); // convert to RPC byte order
    const timestamp = bigFromBufLE(stream.read(4));
    const bits = stream.read(4).reverse(); // convert LE to BE
    const nonce = stream.read(4).reverse(); // convert LE to BE
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

  public serialize(): Buffer {
    const result = Buffer.alloc(4 + 32 + 32 + 4 + 4 + 4);
    let offset = 0;

    result.writeUInt32LE(Number(this.version), offset);
    offset += 4;

    writeBytesReverse(this.prevBlock, result, offset);
    offset += 32;

    writeBytesReverse(this.merkleRoot, result, offset);
    offset += 32;

    result.writeUInt32LE(Number(this.timestamp), offset);
    offset += 4;

    writeBytesReverse(this.bits, result, offset);
    offset += 4;

    writeBytesReverse(this.nonce, result, offset);
    offset += 4;

    return result;
  }

  public hash(): Buffer {
    return hash256(this.serialize());
  }

  public static mineBlock(
    version: Buffer,
    prevBlockHash: Buffer,
    merkleRoot: Buffer,
    bits: Buffer
  ) {
    let nonce = 0;
    let hash = "";

    while (true) {
      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const block = createBlock(merkleRoot.toString("hex"), nonce);
      const buffer = Buffer.from(block, "hex");

      const h1 = createHash("sha256").update(buffer).digest();
      const h2 = createHash("sha256").update(h1).digest();
      const hash = h2.reverse().reverse();

      if (difficulty.compare(hash) < 0) {
        return { block, hash };
      }

      nonce++;
    }
  }
}

function createBlock(merkle_root, nonce) {
  let serialize = "";
  serialize += "11000000"; // Version -> 4 bytes -> Little Endian
  serialize += (0).toString(16).padStart(64, "0"); // Previous Block Hash -> 32 bytes -> Natural byte order
  serialize += merkle_root; // Merkle Root -> 32 bytes -> Natural Byte Order
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
