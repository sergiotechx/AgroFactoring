import * as StellarSdk from "@stellar/stellar-sdk";

const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID_RAW = process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID;
const ORACLE_SECRET_RAW = process.env.NEXT_STELLAR_SECRET_KEY;

if (!CONTRACT_ID_RAW) {
  throw new Error(
    "Falta NEXT_PUBLIC_STELLAR_CONTRACT_ID en las variables de entorno"
  );
}
if (!ORACLE_SECRET_RAW) {
  throw new Error(
    "Falta NEXT_STELLAR_SECRET_KEY en las variables de entorno (clave del oráculo/admin)"
  );
}

const CONTRACT_ID: string = CONTRACT_ID_RAW;
const ORACLE_SECRET: string = ORACLE_SECRET_RAW;

export const rpc = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
export const networkPassphrase = StellarSdk.Networks.TESTNET;
export const contractId = CONTRACT_ID;

export function getOracleKeypair(): StellarSdk.Keypair {
  return StellarSdk.Keypair.fromSecret(ORACLE_SECRET);
}

export function getContract(): StellarSdk.Contract {
  return new StellarSdk.Contract(contractId);
}

export { StellarSdk };
