#! node
// Above shebang is used for making this an executable CLI
// https://stackoverflow.com/questions/23298295/how-to-make-a-shell-executable-node-file-using-typescript/62672365#62672365

import fs from 'fs';
import yargs, { Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';

type TransactionInfo = {
    transactionType: string;
    contractName: string;
    contractAddress: string;
};

function parseMaps(maps: string[]): Map<string, string> {
    const res = new Map<string, string>();
    if (typeof maps == 'string') {
        maps = [maps];
    }
    for (const map of maps) {
        const [k, v] = map.split('=');
        if (!k || !v) {
            throw Error("Invalid map format. Expected 'k=v', got " + map);
        }
        res.set(k, v);
    }
    return res;
}

async function main(path: string, envPath: string, maps: any) {
    const mapping = parseMaps(maps);
    const runInfo = JSON.parse(fs.readFileSync(path).toString());
    // TODO add a typesafe deserialize here
    const deployments = runInfo.deployments;
    if (!deployments) {
        throw Error('No deployments in runInfo');
    }

    for (const deployment of deployments) {
        const transactions: TransactionInfo[] = deployment.transactions;
        let chainId = deployment.chain;
        if (!transactions || !chainId) {
            throw Error('Either or both of transaction and chainId are missing');
        }
        chainId = parseInt(chainId);
        for (const tx of transactions) {
            const type = tx.transactionType;
            const contractName = tx.contractName;
            const contractAddress = tx.contractAddress;
            if (type == 'CREATE') {
                const mappedContractName = mapping.get(contractName) ?? contractName;
                const envName = `${mappedContractName}_ADDRESS_${chainId}`;
                console.log(`${envName}="${contractAddress}"`);
            }
        }
        console.log('');
    }
}

const argv = yargs(hideBin(process.argv))
    .command(
        'parse-deploy',
        'Parse a forge script deployment run.json and write to environment variables.',
        (yargs: Argv) => {
            return yargs
                .option('path', {
                    describe: 'path to the run.json file'
                })
                .option('envPath', {
                    describe: 'path to the .env file',
                    default: '../../.env'
                })
                .coerce(['path', 'envPath'], path.resolve)
                .option('map', {
                    type: 'string',
                    array: true,
                    describe: 'MockLightClient=LightClient for example',
                    default: []
                });
        }
    )
    .parseSync();

main(argv.path!, argv.envPath!, argv.map);
