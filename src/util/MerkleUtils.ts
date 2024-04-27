import { createHash } from "crypto";

export const generateMerkleRoot = (txids) => {
  if (txids.length === 0) return null;

  let level = txids.map((txid) =>
    Buffer.from(txid, "hex").reverse().toString("hex")
  );

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

export const calculateWitnessCommitment = (wtxids) => {
  const witnessRoot = generateMerkleRoot(wtxids);

  const witnessReservedValue = WITNESS_RESERVED_VALUE.toString("hex");
  const wc = hash25(witnessRoot + witnessReservedValue);
  return wc;
};

export const WITNESS_RESERVED_VALUE = Buffer.from(
  "0000000000000000000000000000000000000000000000000000000000000000",
  "hex"
);
