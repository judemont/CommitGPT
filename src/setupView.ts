import * as vscode from 'vscode';

export function setupView(context: vscode.ExtensionContext) {
    const treeDataProvider = {
        getChildren: () => ['How to use:',
        'Use the keybind to stage&commit all changes.',
        'For Mac: cmd + alt + c',
        'For Windows: ctrl + alt + c',
        'Thanks for using CommitGPT!',
        'Click here to learn more about CommitGPT'],
        getTreeItem: (item: string): vscode.TreeItem => {
            const treeItem = new vscode.TreeItem(item);
            if (item === 'Click here to learn more about CommitGPT') {
                treeItem.command = {
                    command: 'extension.showWebView',
                    title: 'Show WebView',
                    arguments: [item]
                };
            }
            return treeItem;
        }
    };

    vscode.window.createTreeView('settingsView', { treeDataProvider });

    let webView = vscode.commands.registerCommand('extension.showWebView', () => {
        const panel = vscode.window.createWebviewPanel(
            'webView',
            'Our Info',
            vscode.ViewColumn.One,
            {}
        );

        panel.webview.html = `<h1>About CommitGPT</h1>
        <p>
        CommitGPT is a one-day project by sid.ai, a company that is building the next generation of AI tools for developers.
        </p>`;
    });

    context.subscriptions.push(webView);
}
