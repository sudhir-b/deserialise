import { web3, Program, AnchorProvider, Wallet } from "@project-serum/anchor";
import axios from "axios";

function respond(statusCode: number, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    isBase64Encoded: false,
    body: JSON.stringify(body, null, 2),
  };
}

const IDL_FUNCTION_URL = process.env.IDL_FUNCTION_URL;

const commitment = "confirmed";
const preflightCommitment = "confirmed";
const CLUSTER_URL_MAP = {
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  testnet: "https://api.testnet.solana.com",
  devnet: "https://api.devnet.solana.com",
};

export async function deserialise(event, context) {
  console.log(event);

  if (!("queryStringParameters" in event)) {
    return respond(400, { error: "No query string parameters provided" });
  }

  if (!("programId" in event.queryStringParameters)) {
    return respond(400, { error: "No program ID provided" });
  }

  if (!("accountType" in event.queryStringParameters)) {
    return respond(400, { error: "No account type provided" });
  }

  if (!("accountId" in event.queryStringParameters)) {
    return respond(400, { error: "No accountID provided" });
  }

  let cluster, clusterUrl;
  if (!("cluster" in event.queryStringParameters)) {
    cluster = "mainnet-beta";
  } else {
    cluster = event.queryStringParameters.cluster;
    if (!(cluster in CLUSTER_URL_MAP)) {
      return respond(400, { error: "Invalid cluster provided" });
    }
    clusterUrl = CLUSTER_URL_MAP[cluster];
  }

  const connection = new web3.Connection(clusterUrl, commitment);
  const tempWallet = new Wallet(web3.Keypair.generate());
  const provider = new AnchorProvider(connection, tempWallet, {
    preflightCommitment,
    commitment,
  });

  let programId: web3.PublicKey;
  let accountId: web3.PublicKey;
  try {
    programId = new web3.PublicKey(event.queryStringParameters.programId);
    accountId = new web3.PublicKey(event.queryStringParameters.accountId);
  } catch (error) {
    return respond(400, { error: "Invalid program ID" });
  }

  const [programSigner] = await web3.PublicKey.findProgramAddress(
    [],
    programId
  );

  const idlPublicKey = await web3.PublicKey.createWithSeed(
    programSigner,
    "anchor:idl",
    programId
  );

  const idlResponse = await axios.get(
    `${IDL_FUNCTION_URL}?idlAccountId=${idlPublicKey.toBase58()}&cluster=${cluster}`
  );

  console.debug(idlResponse);

  if (idlResponse.status !== 200) {
    return respond(400, { error: "Error fetching IDL" });
  }

  const idl = idlResponse.data;

  const program = new Program(idl, programId, provider);

  const account = await program.account[
    event.queryStringParameters.accountType
  ].fetch(accountId);

  console.debug(account);

  return respond(200, account);
}

// test url query params
// programId=GrAkKfEpTKQuVHG2Y97Y2FF4i7y7Q5AHLK94JBy7Y5yv&accountType=registrar&accountId=43JchZn2K9ZD1dAfP9hTNUSWFvWYhK8df7R5RKeVQB2G
