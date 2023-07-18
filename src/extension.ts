import * as vscode from 'vscode';
import { exec as execCb } from 'child_process';
import * as util from 'util';
import * as path from 'path';
import { OpenAI } from "langchain/llms/openai";
import axios from 'axios';
import { setupView } from './setupView';


const exec = util.promisify(execCb);

export async function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.commitgpt', async () => {
        if (vscode.workspace.workspaceFolders !== undefined) {
            const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

            try {
				await vscode.workspace.saveAll();
                const diffOutput = await exec('git diff HEAD', { cwd: workspacePath });

                const modelName = vscode.workspace.getConfiguration('commitgpt').get<string>('modelName') || 'gpt-3.5-turbo';
                const openaiAPIKey = vscode.workspace.getConfiguration('commitgpt').get<string>('openaiAPIKey');

                if (!diffOutput.stdout) {
                    vscode.window.showErrorMessage('No changes detected. Note: New files need to be staged before committing.');
                    return;
                }

                let tag = '';
                let changes = '';
                //check if OPENAI_API_KEY is set
                if (openaiAPIKey) {
                    const model = new OpenAI({
                        openAIApiKey: openaiAPIKey,
                        modelName: modelName,
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
                    const apiEndpoint = 'https://j5yyu4vgwwidqgtotflx5uc2ta0mxgld.lambda-url.us-east-1.on.aws/'; // replace with your API endpoint
                    const apiResponse = await axios.post(apiEndpoint, { content: diffOutput.stdout });
                    changes = apiResponse.data;
                }

                const commitMessage = `${tag} ${changes}`;

                try {
                    const coauthor = 'Co-authored-by: CommitGPT by SID.ai <commitgpt@sid.ai>';
                    await exec(`git commit -a -m "${commitMessage}" -m "${coauthor}"`, { cwd: workspacePath });
                    vscode.window.showInformationMessage(`Commit successful: ${commitMessage}`);
                } catch (err) {
					if (err instanceof Error) {
						vscode.window.showErrorMessage('Something went wrong, please try again: ' + err.message);
					} else {
						vscode.window.showErrorMessage(`Git commit failed: ${String(err)}`);
					}
                }
            } catch (err) {
                vscode.window.showErrorMessage('Something went wrong: ' + String(err)  );
            }
        }
    });

    context.subscriptions.push(disposable);

    let hotkey = vscode.commands.registerCommand('extension.commitgptHotkey', () => {
        vscode.commands.executeCommand('extension.commitgpt');
    });

	//setupView(context);

    context.subscriptions.push(hotkey);
}


export function deactivate() {}
