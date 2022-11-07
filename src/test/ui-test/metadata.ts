import * as fs from 'fs';

export interface Metadata {
    displayName: string,
    description: string,
    contributes: {
        commands: string[]
    }
}


let metadata: Metadata | undefined;
export function getMetadata(): Metadata {
    if (metadata !== undefined) {
        return metadata;
    }

    metadata = JSON.parse(fs.readFileSync('package.json', {
        encoding: 'utf-8'
    }));

    return metadata as any;
}