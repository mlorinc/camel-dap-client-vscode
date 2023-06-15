import * as path from 'path';
import { variables } from '../../variables';
import {
    after,
    before,
    CodeLens,
    DebugToolbar,
    EditorTabNotFound,
    EditorView,
    error,
    errors,
    repeat,
    Repeat,
    resources,
    TextEditor,
    until,
    VSBrowser,
    workspaces
} from 'vscode-uitests-tooling';

const file = 'JBang.yaml';

describe('JBang codelens debug', function () {
    this.timeout(45000);
    this.slow(10000);
    const workspace = workspaces.createWorkspace(VSBrowser.instance, variables.launcher.WORKBENCH_DIR);
    const manager = resources.createResourceManager(VSBrowser.instance, workspace, variables.launcher.RESOURCES_DIR);

    before(async function () {
        await workspace.delete();
        await workspace.create();
        await manager.copy(file);
        await workspace.open();
    });

    after(async function () {
        await clearBreakpoint(9, 5000).catch(console.error);
        await clearBreakpoint(15, 5000).catch(console.error);
        await workspace.close(5000).catch(console.error);
        await workspace.delete();
    });

    it('JBang.yaml codelen debug works', async function () {
        await openFile(path.join(workspace.path, file));
        await addBreakpoint(9);
        await addBreakpoint(15);

        // There is a case when codelen becomes stale and must
        // be refreshed.
        await repeat(async () => {
            await VSBrowser.instance.driver.sleep(750);
            const codelen = await findCodelen('Camel Debug with JBang');
            const debug = await startDebug(codelen);
            await waitBreakpoint(9);
            await debug.continue();
            await waitBreakpoint(15);
            await stopDebug(debug);
            return true;
        }, {
            message: 'could not find codelen and debug it',
            ignoreErrors: errors.INTERACTIVITY_ERRORS
        });
    });
});

async function openFile(filePath: string): Promise<void> {
    await VSBrowser.instance.openResources(filePath);
    await repeat(async () => {
        const view = new EditorView();
        try {
            const tab = await view.getTabByTitle(file);

            if (await tab.isSelected()) {
                return tab;
            }

            await tab.select();
            return {
                value: undefined,
                delay: 750
            };
        }
        catch (e) {
            if (e instanceof EditorTabNotFound) {
                return undefined;
            }
            throw e;
        }
    }, {
        ignoreErrors: errors.INTERACTIVITY_ERRORS,
        message: `could not find tab for file: ${file}, ${filePath}`
    });
}

async function findCodelen(title: string): Promise<CodeLens> {
    return await repeat(async () => {
        const editor = new TextEditor();
        return await editor.getCodeLens(title);
    }, {
        ignoreErrors: [...errors.INTERACTIVITY_ERRORS, error.TimeoutError],
        message: `could not find codelens: ${title}`
    });
}

async function startDebug(codelen: CodeLens): Promise<DebugToolbar> {
    await codelen.click();
    return await DebugToolbar.create(Repeat.DEFAULT_TIMEOUT);
}

async function stopDebug(debug: DebugToolbar): Promise<void> {
    await debug.disconnect();
    await debug.getDriver().wait(until.elementIsNotVisible(debug), Repeat.DEFAULT_TIMEOUT);
}

async function addBreakpoint(line: number): Promise<void> {
    await repeat(async () => {
        const editor = new TextEditor();
        return await editor.toggleBreakpoint(line);
    }, {
        ignoreErrors: errors.INTERACTIVITY_ERRORS,
        message: `could not add breakpoint at ${line}`
    });
}

async function clearBreakpoint(line: number, timeout?: number): Promise<void> {
    await repeat(async () => {
        const editor = new TextEditor();
        return await editor.toggleBreakpoint(line) === false;
    }, {
        ignoreErrors: errors.INTERACTIVITY_ERRORS,
        message: `could not clear breakpoint at ${line}`,
        timeout
    });
}

async function waitBreakpoint(line: number): Promise<void> {
    await repeat(async () => {
        const editor = new TextEditor();
        const breakpoint = await editor.getPausedBreakpoint();
        return await breakpoint?.getLineNumber() === line;
    }, {
        ignoreErrors: errors.INTERACTIVITY_ERRORS,
        message: `breakpoint did not stop at line ${line}`
    });
}
