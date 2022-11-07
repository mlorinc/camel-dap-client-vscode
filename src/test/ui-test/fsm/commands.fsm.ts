import { BaseContext, declareDependencies, ProvideComplete as ProvideComp, ProvidePublic as ProvidePub, StateMachine, ValueDependency, WebElementDependency } from "selenium-state-machine";
import { InputBox, Workbench } from "vscode-extension-tester";
import { getMetadata } from "../metadata";

export interface Context extends BaseContext {
    commands: string[],
    index: number
}

type ProvidePublic = ProvidePub<Context, typeof dependencies>;
type ProvideComplete = ProvideComp<Context, typeof dependencies>;

export const dependencies = declareDependencies({
    input: new WebElementDependency<InputBox>(),
    metadata: new ValueDependency({value: getMetadata()})
});

export async function openInput(provide: ProvidePublic, {input}: typeof dependencies): Promise<ProvideComplete> {
    if (!provide.hasTimer(openInput) || provide.hasElapsedTimer(openInput)) {
        const workbench = new Workbench();
        await workbench.openCommandPrompt();
        return provide.nothing().tryAgain().createTimer(openInput, 7500);
    }

    const box = new InputBox();

    if (await box.isDisplayed()) {
        const {commands, index} = provide.context;
        const next = index >= 0 ? commands[index] : startCheck;
        return provide.dependency(input, box).transition(next).clearTimer(openInput);
    }

    return provide.nothing().tryAgain();
}

export async function startCheck(provide: ProvidePublic): Promise<ProvideComplete> {
    return provide.nothing().next();
}

function checkCommand(command: string) {
    const func = async function(provide: ProvidePublic, {input}: typeof dependencies): Promise<ProvideComplete> {
        if (await input.value.isDisplayed() === false) {
            return provide.nothing().transition(openInput);
        }

        if (await input.value.getText() !== `>${command}`) {
            await input.value.setText(`>${command}`);
        }

        const pick = await input.value.findQuickPick(command);

        if (await pick?.getLabel() === command){
            const { index } = provide.context;
            return provide.nothing().next().updateContext({ index: index + 1 });
        }

        return provide.nothing().tryAgain();
    };
    Object.defineProperty(func, 'name', {value: `checkCommand-${command}`});
    return func;
}

export async function closeInput(provide: ProvidePublic, {input}: typeof dependencies): Promise<ProvideComplete> {
    if (await input.value.isDisplayed()) {
        await input.value.cancel();
        return provide.nothing().tryAgain();
    }
    return provide.nothing().next();
}

export function addCommandChecks(fsm: StateMachine<Context, typeof dependencies>, metadata: any): void {
    const commands = metadata['contributes']['commands'];
    for (const command of commands) {
        const title: string = command.title;
        fsm.state(checkCommand(title));
    }
}
