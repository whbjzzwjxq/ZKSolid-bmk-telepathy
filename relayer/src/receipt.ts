// import axios from 'axios';

// import config from 'dotenv';
// config.config({ path: '../.env' });

// import { Trie } from '@ethereumjs/trie';
// import { Log } from '@ethereumjs/evm';
// import { BaseTxReceipt, PostByzantiumTxReceipt, TxReceipt } from '@ethereumjs/vm';
// import { encodeReceipt } from '@ethereumjs/vm/dist/runBlock';
// import { Block, BlockData } from '@ethereumjs/block';
// import { Chain, Common, Hardfork } from '@ethereumjs/common';
// import { RLP } from '@ethereumjs/rlp';
// import { BitArray, toHexString, fromHexString } from '@chainsafe/ssz';

// const PRINT = false;

// export async function getReceiptProof(txHash: string) {
//     // https://goerli.etherscan.io/block/7943444 this is a block with 1 transaction
//     // The transaction is: 0xae19ab98415b8515309cb794165457c9ebe1d874ad169eddf8d41c059f4ed618

//     // Get the transaction
//     const resp = await axios.post(process.env.GOERLI_RPC_URL, {
//         id: 1,
//         jsonrpc: '2.0',
//         method: 'eth_getTransactionByHash',
//         params: [txHash]
//     });
//     const blockHash = resp.data.result.blockHash;
//     const block = await axios.post(process.env.GOERLI_RPC_URL, {
//         id: 1,
//         jsonrpc: '2.0',
//         method: 'eth_getBlockByHash',
//         params: [blockHash, true]
//     });
//     const transactions = block.data.result.transactions;
//     console.log('Processing', transactions.length, 'transactions.');

//     let txIndex = -1;
//     const receiptTrie = new Trie(); // use an in memory Trie
//     for (let i = 0; i < transactions.length; i++) {
//         const receipt = await axios.post(process.env.GOERLI_RPC_URL, {
//             id: 1,
//             jsonrpc: '2.0',
//             method: 'eth_getTransactionReceipt',
//             params: [transactions[i].hash]
//         });
//         if (transactions[i].hash == txHash) {
//             txIndex = i;
//             console.log('Printing out my transaction receipt topics and data');
//             console.log(receipt.data.result.logs[2].topics);
//             console.log(receipt.data.result.logs[2].data);
//         }

//         // TxReceipt
//         const txResultTyped: TxReceipt = {
//             cumulativeBlockGasUsed: BigInt(receipt.data.result.cumulativeGasUsed),
//             bitvector: Buffer.from(fromHexString(receipt.data.result.logsBloom)),
//             logs: receipt.data.result.logs.map((log: any) => {
//                 return [
//                     Buffer.from(fromHexString(log.address)),
//                     log.topics.map((x: string) => Buffer.from(fromHexString(x))),
//                     Buffer.from(fromHexString(log.data))
//                 ];
//             }) as Log[],
//             status: receipt.data.result.status === '0x1' ? 1 : 0
//         };

//         let type = 0;
//         if (receipt.data.result.type == '0x1') {
//             type = 1;
//         } else if (receipt.data.result.type == '0x2') {
//             type = 2;
//         } else if (receipt.data.result.type != '0x0') {
//             throw Error(`Unknown receipt type ${receipt.data.result.type}`);
//         }

//         let encodedReceipt = encodeReceipt(txResultTyped, type);
//         if (PRINT && (i == 0 || i == 1)) {
//             console.log('i', i);
//             console.log('key', Buffer.from(RLP.encode(i)));
//             console.log('len value', encodedReceipt.length);
//             console.log(txResultTyped.cumulativeBlockGasUsed);
//             console.log(txResultTyped.status);
//             console.log(txResultTyped.bitvector);
//             console.log(toHexString(txResultTyped.bitvector));
//             console.log(txResultTyped.logs);
//             console.log('value', encodedReceipt);
//             console.log('\n\n');
//             console.log(toHexString(Buffer.from(RLP.encode(i))));
//             console.log(toHexString(encodedReceipt));
//             console.log('\n\n');
//         }
//         await receiptTrie.put(Buffer.from(RLP.encode(i)), encodedReceipt);
//     }
//     if (txIndex == -1) {
//         throw Error('transaction with hash ' + txHash + ' not found in block ' + blockHash);
//     }

//     const computedReceiptRoot = receiptTrie.root();
//     console.log('Key of rlp encoding of txindex', toHexString(RLP.encode(txIndex)));
//     const receiptProof = await receiptTrie.createProof(Buffer.from(RLP.encode(txIndex)));
//     console.log('Computed receipt root', computedReceiptRoot.toString('hex'));
//     const receiptsRoot = block.data.result.receiptsRoot;
//     console.log('True receipt root', receiptsRoot);
//     if (receiptsRoot !== toHexString(computedReceiptRoot)) {
//         throw Error('The computed and true receipts root do not match');
//     }
//     console.log(toHexString(RLP.encode(receiptProof)));
//     return receiptProof.map((x) => toHexString(x)); // return the receipt proof
// }

// async function main() {
//     const proof = await getReceiptProof(
//         '0x29f2d00f672cfca2ba47d64bae25a5e3c22c964027d7da53d94fc0232b9fee32'
//     );
//     console.log(proof);
// }

// main();
