import { BaseContext, declareDependencies, ProvideComplete as ProvideComp, ProvideFunction, ProvidePublic as ProvidePub, ValueDependency, WebElementDependency } from 'selenium-state-machine';
import { ExtensionsViewItem, ExtensionsViewSection, SideBarView, ViewControl, ViewSection, Workbench } from 'vscode-extension-tester';
import { expect } from 'chai';
import { StaleDependencyReferenceError } from 'selenium-state-machine/lib/Dependency';
import { getMetadata, Metadata } from '../metadata';

type ProvidePublic = ProvidePub<BaseContext, typeof dependencies>;
type ProvideComplete = ProvideComp<BaseContext, typeof dependencies>;


export const dependencies = declareDependencies({
    extension: new WebElementDependency<ExtensionsViewItem>(),
    marketplace: new WebElementDependency<ExtensionsViewSection>(),
    metadata: new ValueDependency<Metadata>({ value: getMetadata() })
});

export async function getMarketplaceSection(sections: ViewSection[]): Promise<ExtensionsViewSection | undefined> {
    for (const section of sections) {
        if (section instanceof ExtensionsViewSection) {
            return section;
        }
    }
    return undefined;
}

export async function getMarketplace(provide: ProvidePublic, { marketplace }: typeof dependencies): Promise<ProvideComplete> {
    const content = new SideBarView().getContent();

    if (await content.isDisplayed() === false) {
        return provide.nothing().transition(openMarketplace);
    }

    const marketplaceSection = await getMarketplaceSection(await content.getSections());

    if (marketplaceSection) {
        return provide.dependency(marketplace, marketplaceSection).transition(openExtensionPage);
    }

    if (provide.hasElapsedTimer(getMarketplace) || !provide.hasTimer(getMarketplace)) {
        return provide.nothing().tryAgain().createTimer(getMarketplace, 7500);
    }
    else {
        return provide.nothing().transition(openMarketplace);
    }
}

async function toggleMarketplace(provide: ProvidePublic, nextState: string | ProvideFunction<BaseContext, typeof dependencies>, functionName: string): Promise<ProvideComplete> {
    const workbench = new Workbench();
    const activityBar = workbench.getActivityBar();
    const control = await activityBar.getViewControl('Extensions');

    if (control instanceof ViewControl && (provide.hasElapsedTimer(functionName) || !provide.hasTimer(functionName))) {
        await control.openView();
        return provide.nothing().transition(nextState).createTimer(functionName, 7500);
    }
    else {
        return provide.nothing().tryAgain();
    }
}

export async function openMarketplace(provide: ProvidePublic): Promise<ProvideComplete> {
    return toggleMarketplace(provide, getMarketplace, openMarketplace.name);
}

export async function openExtensionPage(provide: ProvidePublic, { extension, marketplace, metadata }: typeof dependencies): Promise<ProvideComplete> {
    const item = await marketplace.value.findItem(`@installed ${metadata.value.displayName}`);

    if (item) {
        return provide.dependency(extension, item).transition(performChecks);
    }

    return provide.nothing().transition(getMarketplace);
}

export async function performChecks(provide: ProvidePublic, { extension, metadata }: typeof dependencies): Promise<ProvideComplete> {
    expect(await extension.value.getTitle(), 'title is not correct').to.be.equal(metadata.value.displayName);
    expect(await extension.value.getDescription(), 'description is incorrect').to.be.equal(metadata.value.description);
    expect(await extension.value.getAuthor(), 'author is incorrect').to.be.equal('Red Hat');
    expect(await extension.value.isInstalled(), 'extension is not installed').to.be.true;
    return provide.nothing().transition(closeMarketplace);
};

export async function closeMarketplace(provide: ProvidePublic): Promise<ProvideComplete> {
    return toggleMarketplace(provide, checkMarketplaceVisibility, closeMarketplace.name);
}

export async function checkMarketplaceVisibility(provide: ProvidePublic, { marketplace }: typeof dependencies): Promise<ProvideComplete> {
    try {
        if (await marketplace.value.isDisplayed() === false) {
            return provide.nothing().next();
        }
        return provide.nothing().transition(closeMarketplace);
    }
    catch (e) {
        if (e instanceof StaleDependencyReferenceError && e.dependency.id === marketplace.id) {
            return provide.nothing().next();
        }
        throw e;
    }
}
