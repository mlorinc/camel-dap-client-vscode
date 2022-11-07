import { StateMachine } from 'selenium-state-machine';
import * as marketplace from './fsm/marketplace.fsm';
import * as commands from './fsm/commands.fsm';
import { getMetadata } from './metadata';


describe('Marketplace presentation', function () {
    this.timeout(process.env.DEBUG_UI_TEST ? 0 : 30000);
    this.slow(10000);
    const extensionMetadata = getMetadata();

    process.env.SSM_STDOUT_LOGGING = '1';
    const marketplaceSm = new StateMachine({name: 'Marketplace', timeout: 150000}, marketplace.dependencies);
    const commandsSm = new StateMachine<commands.Context, typeof commands.dependencies>({name: 'Commands', timeout: 150000, index: -1, commands: extensionMetadata.contributes.commands}, commands.dependencies);


    before('Build the state machine', function () {
        marketplaceSm.state(marketplace.getMarketplace);
        marketplaceSm.state(marketplace.openMarketplace);
        marketplaceSm.state(marketplace.openExtensionPage);
        marketplaceSm.state(marketplace.performChecks);
        marketplaceSm.state(marketplace.closeMarketplace);
        marketplaceSm.state(marketplace.checkMarketplaceVisibility);

        commandsSm.state(commands.openInput);
        commandsSm.state(commands.startCheck);
        commands.addCommandChecks(commandsSm, extensionMetadata);
        commandsSm.state(commands.closeInput);
    });

    after(function() {
        marketplaceSm.stop();
        commandsSm.stop();
    });

    it('marketplace test', async function() {
        await marketplaceSm.start();
    });

    it('input test', async function() {
        await commandsSm.start();
    });
});
