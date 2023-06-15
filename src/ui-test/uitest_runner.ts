/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

import * as fs from 'fs';
import { variables } from './variables';
import { Repeat, ExTester, ReleaseQuality } from 'vscode-uitests-tooling';

const releaseType: ReleaseQuality = process.env.CODE_TYPE === 'insider' ? ReleaseQuality.Insider : ReleaseQuality.Stable;

async function main(): Promise<void> {
    process.on('exit', cleanup);

    cleanup();
    fs.mkdirSync(variables.launcher.EXTENSION_DIR, { recursive: true });

    Repeat.DEFAULT_TIMEOUT = 30000;

	const tester = new ExTester(undefined, releaseType, variables.launcher.EXTENSION_DIR);
	await tester.setupAndRunTests(process.argv.slice(2),
		process.env.CODE_VERSION,
		{
			'installDependencies': true
		},
		{
			'cleanup': true,
			'settings': './src/ui-test/resources/vscode-settings.json',
			resources: []
		});
}

main();

function cleanup() {
	fs.rmSync(variables.launcher.EXTENSION_DIR, { recursive: true, force: true });
}