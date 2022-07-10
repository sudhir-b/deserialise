# Deserialise

Deserialise is an implementation of dynamic Solana account deserialisation using
[on-chain IDL files as specified by the Anchor framework](https://book.anchor-lang.com/anchor_references/cli.html#idl), designed to be accessed behind an AWS Lambda Function URL (with or without
a custom domain) with plain HTTP GET requests.

`HTTP GET` requests to a function URL take the following query parameters:

- `programId`
  - **required**
  - base 58 encoded public key
- `accountId`
  - **required**
  - base 58 encoded public key
- `accountType`
  - **required**
  - base 58 encoded public key
- `cluster`
  - optional
  - if specified, must be one of: `mainnet-beta`, `testnet`, `devnet`
  - defaults to `mainnet-beta` if unspecified

### Example request:

```
https://<LAMBDA_FUNCTION_URL>?programId=nosJhNRqr2bc9g1nfGDcXXTXvYUmxD4cVwy2pMWhrYM&accountType=jobs&accountId=BNHE7twpb1SQVutNkZ9knQfLTjaAMpGMwnwKGBmsPyZw
```

This query fetches the on-chain IDL for the program `nosJhNRqr2bc9g1nfGDcXXTXvYUmxD4cVwy2pMWhrYM`,
which is the [Nosana Jobs program](https://github.com/nosana-ci/nosana-jobs) (just a handy
example - no affiliation), and attempts to deserialise and return the account data at
`BNHE7twpb1SQVutNkZ9knQfLTjaAMpGMwnwKGBmsPyZw` by using the account definition for
the account `jobs` in the IDL file.

## Motivation

The main motivation for this was the lack of some service, accessible via plain
HTTP GET requests, that could be used to deserialise on-chain NFT metadata so that
a the URI for the deserialised account could be used in the `URI` field of a
Metaplex Token Metadata account for an NFT.

## Design

The account deserialisation here uses two Lambda functions - one written in TypeScript,
and another written in Rust.

The entrypoint for the end-to-end account deserialisation is the TypeScript Lambda function,
which calls into the Rust function to fetch and deserialise on-chain IDL files.
The Rust Lambda function can be used on its own to retrieve IDL files written to on-chain accounts.

## Installation

### Prerequisites

- [cargo-lambda](https://github.com/cargo-lambda/cargo-lambda)
- [Serverless framework](https://www.serverless.com/framework/docs/getting-started)
- [Yarn](https://yarnpkg.com/getting-started/install)
- an AWS account with an IAM role set up for the Rust Lambda function - something like
  the following should be sufficient:

    <details>
    <summary>Example IAM Role</summary>

  ```
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Action": [
                  "logs:CreateLogStream",
                  "logs:CreateLogGroup"
              ],
              "Resource": [
                  "arn:aws:logs:eu-west-1:135929403262:log-group:/aws/lambda/deserialise-dev*:*"
              ],
              "Effect": "Allow"
          },
          {
              "Action": [
                  "logs:PutLogEvents"
              ],
              "Resource": [
                  "arn:aws:logs:eu-west-1:135929403262:log-group:/aws/lambda/deserialise-dev*:*:*"
              ],
              "Effect": "Allow"
          }
      ]
  }
  ```

    </details>

### Rust Lambda function

In `./rust`, to build the Rust Lambda function, run

`cargo lambda build --release --arm64`

To deploy, run:

`cargo lambda deploy --iam-role <LAMBDA_IAM_ROLE> --enable-function-url deserialise --profile <AWS_PROFILE>`

You may omit `--profile` if you have a default AWS profile set up.

In order for the TypeScript Lambda function to be deployed, you will have to
create a new SSM parameter called `idl_function_url` with the value set to the
Lambda function URL you receive from deploying the Rust lambda function.

### TypeScript Lambda function

In `./ts`, first run `yarn install`.

Then, run `sls deploy --aws-profile <AWS_PROFILE>`

You may omit `--profile` if you have a default AWS profile set up.

## Limitations & future work

### **Issues with the design**

I tried (admittedly not for too long) to write this all as a single TypeScript function,
but I was having trouble correctly inflating the compressed IDL file with zlib. I could
well have missed something obvious though, which I'd be glad to find out!

I also tried to write this all as a single Rust function, but I ran into a problem
trying to dynamically use the fetched IDL file to deserialise other program accounts.
If I've missed something obvious, please let me know.

This project uses a Lambda 'anti-pattern' of having one Lambda synchronously invoke
another, which was my workaround for not being to write it all in a single function.

I've used the spelling 'deserialise' with an 's' instead of a 'z' because I'm
British, but I don't actually have a strong opinion on this, so please don't
pick a fight with me about it!

I'm also relatively new to both TypeScript & Rust so it's likely there's
un-idiomatic code in this project - let me know what can be done better!
### **TODO list**
In no particular order:

- Improve error handling
- Provide an option to 'metaplex-ise' the deserialised account data
- Allow custom cluster URLs
- Be able to deploy both Lambda functions with the same tool/command (try AWS CDK?)
- Add instructions for putting Lambda Function URLs behind custom domain names
- Allow abbreviated cluster names in query params
- It would be nice if the type of account could be worked out from the account
  data - more specifically, it feels like the account discriminator should be 
  enough to know, so we might be able to avoid asking for `accountType`
- Improve performance? (currently ~2s from cold start)

## Credit

The Rust Lambda function borrows very heavily from the code in the function
`fetch_idl` in the [Anchor CLI source code](https://github.com/coral-xyz/anchor/blob/master/cli/src/lib.rs).
## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
