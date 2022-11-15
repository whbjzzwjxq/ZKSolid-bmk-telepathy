#!/bin/bash
CIRCUIT_NAME=poseidon
CIRCUITS_DIR=`realpath ../../circuits`
BUILD_DIR=`realpath ../../build`
OUTPUT_DIR=`realpath "$BUILD_DIR"/"$CIRCUIT_NAME"_cpp`
NODE_PATH=`realpath ~/node/node`
NODE_CMD="$NODE_PATH --trace-gc --trace-gc-ignore-scavenger --max-old-space-size=2048000 --initial-old-space-size=2048000 --no-global-gc-scheduling --no-incremental-marking --max-semi-space-size=1024 --initial-heap-size=2048000 --expose-gc"
SNARKJS_PATH=`realpath ~/snarkjs/cli.js`
RAPIDSNARK_PATH=`realpath ~/rapidsnark/build/prover`

if [ ! -d "$BUILD_DIR" ]; then
    echo "No build directory found. Creating build directory..."
    mkdir -p "$BUILD_DIR"
fi

set -e
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
trap 'echo "\"${last_command}\" command filed with exit code $?."' EXIT

echo "****COMPILING CIRCUIT****"
start=`date +%s`
echo "$CIRCUITS_DIR"/"$CIRCUIT_NAME".circom 
circom poseidon.circom --O1 --r1cs --sym --c --output "$BUILD_DIR"
end=`date +%s`
echo "DONE ($((end-start))s)"

echo "****Running make to make witness generation binary****"
start=`date +%s`
make -C "$OUTPUT_DIR"
end=`date +%s`
echo "DONE ($((end-start))s)"

echo "****Executing witness generation****"
start=`date +%s`
"$OUTPUT_DIR"/"$CIRCUIT_NAME" input.json "$OUTPUT_DIR"/witness.wtns
end=`date +%s`
echo "DONE ($((end-start))s)"

echo "****Converting witness to json****"
start=`date +%s`
npx snarkjs wej "$OUTPUT_DIR"/witness.wtns "$OUTPUT_DIR"/witness.json
end=`date +%s`
echo "DONE ($((end-start))s)"