import { Script } from "../Script";
import { OpCode } from "../operations/opcode";

/**
 * Creates a new p2pkh locked script with the given hash160
 * @param h160
 * @returns
 */
export function p2pkhLock(h160: Buffer): Script {
  return new Script([
    OpCode.OP_DUP,
    OpCode.OP_HASH160,
    h160,
    OpCode.OP_EQUALVERIFY,
    OpCode.OP_CHECKSIG,
  ]);
}
