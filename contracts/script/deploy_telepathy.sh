
#!/bin/bash
forge script LightClient.s.sol:Deploy \
  --rpc-url $1 \
  --chain-id $2 \
  --private-key $3 \
  --verify \
  --broadcast \
  --etherscan-api-key $4 \
  -vvvv
