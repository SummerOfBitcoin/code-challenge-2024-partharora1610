import { ec } from "elliptic";

export class PublicKey {
  private ec: ec;
  private key: ec.KeyPair;

  constructor(publicKeyHex: string | Buffer) {
    this.ec = new ec("secp256k1");
    this.key = this.ec.keyFromPublic(publicKeyHex, "hex");
  }

  verify(signature: any, msgHash: any): boolean {
    return this.key.verify(msgHash, signature);
  }
}
