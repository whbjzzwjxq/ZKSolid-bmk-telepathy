import path from 'path';
import { exec } from 'child_process';
import fs from 'fs';
import { CircomInput, stringifyCircomInput } from './serializer';
import util from 'util';

const execPromise = util.promisify(exec);

export class Circuit {
    witnessExecutablePath: string | undefined;
    proverExecutablePath: string | undefined;
    proverKeyPath: string | undefined;

    constructor(
        witnessExecutablePath?: string,
        proverExecutablePath?: string,
        proverKeyPath?: string
    ) {
        this.witnessExecutablePath = witnessExecutablePath;
        this.proverExecutablePath = proverExecutablePath;
        this.proverKeyPath = proverKeyPath;
    }

    async calculateWitness(input: CircomInput, outputPath: string) {
        if (this.witnessExecutablePath == undefined) {
            throw Error('Witness executable path is not defined');
        }
        fs.writeFileSync('input.json', stringifyCircomInput(input));
        const command = `${this.witnessExecutablePath} input.json ${outputPath}`;
        try {
            const { stdout, stderr } = await execPromise(command);
        } catch (error) {
            console.log(error);
            throw Error('Failed to calculate witness');
        }
    }

    async prove(witnessPath: string, publicOutputsPath: string) {
        if (this.proverExecutablePath == undefined) {
            throw Error('Prover executable path is not defined');
        } else if (this.proverKeyPath == undefined) {
            throw Error('Prover zkey is not defined');
        }
        const command = `${this.proverExecutablePath} ${this.proverKeyPath} ${witnessPath} ${publicOutputsPath}`;
        try {
            const { stdout, stderr } = await execPromise(command);
        } catch (error) {
            console.log(error);
            throw Error('Failed to geerate proof');
        }
    }
}
