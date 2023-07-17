import * as vscode from 'vscode';
import { exec as execCb } from 'child_process';
import * as util from 'util';
import * as path from 'path';
import { OpenAI } from 'langchain';
import { setupView } from './setupView';


const exec = util.promisify(execCb);

export async function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.commitgpt', async () => {
        if (vscode.workspace.workspaceFolders !== undefined) {
            const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

            try {
				await vscode.workspace.saveAll();
                const diffOutput = await exec('git diff HEAD', { cwd: workspacePath });

                const model = new OpenAI({
                    modelName: "gpt-3.5-turbo",
                    temperature: 0,
                });

                const changes = await model.call(
                    "You are an expert at writing concise and detailed commit messages.\n" +
					"Some examples of excellent commit messages are:\n" +
					"Refactor: Simplify logic in calculateDiscount function\n" +
					"Update: Add unit tests for the search functionality\n" +
					"Fix: Correct error in pagination logic\n" +
					"Add: Implement dark mode toggle\n" +
					"Bump: Upgrade React version to 18.0.2\n" +
					"Now generate a concise commit message based on the following 'git diff HEAD' output:\n\n" +
                    diffOutput.stdout +
                    "\n\nCommit message:"
                );

                const commitMessage = `[qs] ${changes}`;

                try {
                    await exec(`git commit -a -m "${commitMessage}+"
					"\nCo-authored-by: CommitGPT by SID.ai <commitgpt@sid.ai>"`, { cwd: workspacePath });
                    vscode.window.showInformationMessage(`Commit successful: ${changes}`);
                } catch (err) {
					if (err instanceof Error) {
						vscode.window.showErrorMessage(`Git commit failed: ${err.message}`);
					} else {
						// handle the error in some other way
						vscode.window.showErrorMessage(`Git commit failed: ${String(err)}`);
					}
                }
            } catch (err) {
                vscode.window.showErrorMessage(`No changes detected.`);
            }
        }
    });

    context.subscriptions.push(disposable);

    let hotkey = vscode.commands.registerCommand('extension.commitgptHotkey', () => {
        vscode.commands.executeCommand('extension.commitgpt');
    });

	setupView(context);

    context.subscriptions.push(hotkey);
}


export function deactivate() {}
