install cargo-lambda

make an IAM role for lambda execution

cargo lambda build --release --arm64
cargo lambda deploy --iam-role <IAM_ROLE_ARN> --enable-function-url <FUNCTION_NAME> --profile <AWS_PROFILE>