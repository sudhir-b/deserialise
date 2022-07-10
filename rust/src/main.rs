use anchor_lang::idl::IdlAccount;
use anchor_lang::AnchorDeserialize;
use anchor_syn::idl::Idl;
use anyhow::anyhow;
use flate2::read::ZlibDecoder;
use lambda_http::{run, service_fn, Error, IntoResponse, Request, RequestExt, Response};
use serde_json;
use solana_client::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::pubkey::Pubkey;
use std::collections::HashMap;
use std::io::Read;
use std::str::FromStr;

fn get_cluster_url(cluster: &str) -> &str {
    match cluster {
        "mainnet-beta" => "https://api.mainnet-beta.solana.com",
        "testnet" => "https://api.testnet.solana.com",
        "devnet" => "https://api.devnet.solana.com",
        _ => panic!("Unknown cluster: {}", cluster),
    }
}

async fn function_handler(event: Request) -> Result<impl IntoResponse, Error> {
    let query_string_params = event.query_string_parameters();
    let query_params: HashMap<_, _> = query_string_params.iter().collect();

    // expected params:
    // - idl account id

    let idl_account_id = Pubkey::from_str(query_params["idlAccountId"]).unwrap();
    let cluster = query_params["cluster"];
    let cluster_url = get_cluster_url(&cluster);

    // TODO: try to do the classic initialization optimization here?
    let client = RpcClient::new(cluster_url);

    let raw_idl_account = client
        .get_account_with_commitment(&idl_account_id, CommitmentConfig::processed())?
        .value
        .map_or(Err(anyhow!("Account not found")), Ok)?;

    // Cut off account discriminator.
    let mut d: &[u8] = &raw_idl_account.data[8..];
    let idl_account: IdlAccount = AnchorDeserialize::deserialize(&mut d)?;

    let mut z = ZlibDecoder::new(&idl_account.data[..]);
    let mut s = Vec::new();
    z.read_to_end(&mut s)?;
    let idl: Idl = serde_json::from_slice(&s[..]).unwrap();

    let idl_json = serde_json::to_string_pretty(&idl).unwrap();

    let resp = Response::builder()
        .status(200)
        .header("content-type", "text/html")
        .body(idl_json)
        .map_err(Box::new)?;
    Ok(resp)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        // disabling time is handy because CloudWatch will add the ingestion time.
        .without_time()
        .init();

    run(service_fn(function_handler)).await
}
