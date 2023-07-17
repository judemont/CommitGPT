import * as vscode from 'vscode';
import { exec as execCb } from 'child_process';
import * as util from 'util';
import * as path from 'path';
import { OpenAI } from "langchain/llms/openai";
import { setupView } from './setupView';


const exec = util.promisify(execCb);

export async function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.commitgpt', async () => {
        if (vscode.workspace.workspaceFolders !== undefined) {
            const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

            try {
				await vscode.workspace.saveAll();
                const diffOutput = await exec('git diff HEAD', { cwd: workspacePath });

                
                let tag = '';
                let changes = '';
                //check if OPENAI_API_KEY is set
                if (process.env.OPENAI_API_KEY) {
                    const model = new OpenAI({
                        modelName: "gpt-3.5-turbo",
                        temperature: 0,
                    });

                    changes = await model.call(
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
                } else {
                    tag = '[sid.ai]';
                    //make call to our own proxy
                    changes = '';
                }

                const commitMessage = `${tag} ${changes}`;

                try {
                    const coauthor = 'Co-authored-by: CommitGPT by SID.ai <commitgpt@sid.ai>';
                    await exec(`git commit -a -m "${commitMessage}" -m "${coauthor}"`, { cwd: workspacePath });
                    vscode.window.showInformationMessage(`Commit successful: ${changes}`);
                } catch (err) {
					if (err instanceof Error) {
						vscode.window.showErrorMessage(`1Git commit failed: ${err.message}`);
					} else {
						// handle the error in some other way
						vscode.window.showErrorMessage(`2Git commit failed: ${String(err)}`);
					}
                }
            } catch (err) {
                vscode.window.showErrorMessage('Git diff failed: ' + String(err)  );
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
