import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { exec } from 'node:child_process';

import { ConfigManager } from '@succinctlabs/telepathy-sdk/config';

import { parseFoundryRunJson } from './parseFoundryDeploy';

async function deployTelepathy(only_parse: boolean) {
    const config = new ConfigManager('../toml/chain.toml', '../.env', true);
    config.addAddressToml('../toml/address.dev.toml');

    const sourceChain = config.filterChains('source')[0];
    const targetChains = config.filterChains('destination');
    const sourceChainId = config.chainId(sourceChain);
    const targetChainIds = targetChains.map((chain: string) => config.chainId(chain));

    const vars = [
        `SALT=0x123368`, // TODO read this from the CLI args
        `SOURCE_CHAIN_ID=${sourceChainId}`,
        `DEST_CHAIN_IDS=${targetChainIds.join(',')}`
    ];
    vars.push(`SourceAMB_${sourceChainId}=${config.address(sourceChain, 'SourceAMB')}`);
    for (let i = 0; i < targetChains.length; i++) {
        vars.push(`TargetAMB_${targetChainIds[i]}=${config.address(targetChains[i], 'TargetAMB')}`);
    }

    let cmd = `cd ../contracts/script && \
        echo '${vars.join('\n')}' > .env && \
        forge script Bridge.s.sol:Deploy \
        --private-key ${config.privateKey()} \
        --broadcast \
        --verify \
        --multi \
        -vvvv`;
    console.log(cmd);
    if (only_parse) {
        cmd = 'echo "Only parsing the latest run.json file"';
    }

    const result = exec(cmd);
    if (result.stdout != undefined) {
        result.stdout.on('data', (data) => {
            console.log(data);
        });
    }
    if (result.stderr != undefined) {
        result.stderr.on('data', (data) => {
            console.error(data);
        });
    }
    result.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        if (code != 0) {
            console.log(
                "If using CREATE2=true, make sure you've set the salt to be a new variable"
            );
        }
        if (code == 0) {
            const runPath = '../contracts/broadcast/multi/Bridge.s.sol-latest/run.json';
            parseFoundryRunJson(runPath);
        }
    });
}

function main() {
    const y = yargs();

    y.command({
        command: 'deploy',
        describe: 'Deploy bridge contracts.',
        builder: {
            only_parse: {
                describe: 'Whether to only parse the run.json file',
                boolean: true
            },
            target: {
                describe: 'UNUSED, remove!',
                demandOption: false,
                type: 'string'
            }
        },
        handler(argv: any) {
            deployTelepathy(argv.only_parse);
        }
    });

    // TODO add verification, either in the original command or a separate one

    y.parse(hideBin(process.argv));
}

main();
