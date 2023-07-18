import * as vscode from 'vscode';
import { exec as execCb } from 'child_process';
import * as util from 'util';
import * as path from 'path';
import { OpenAI } from "langchain/llms/openai";
import axios from 'axios';


const exec = util.promisify(execCb);

export async function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.commitgpt', async () => {
        if (vscode.workspace.workspaceFolders !== undefined) {
            const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

            try {
				await vscode.workspace.saveAll();
                const diffOutput = await exec('git diff HEAD', { cwd: workspacePath });

                const modelName = vscode.workspace.('commitgpt').get<string>('modelName') || 'gpt-3.5-turbo';
                const openaiAPIKey = vscode.workspace.getConfiguration('commitgpt').get<string>('openaiAPIKey');
                const pirateMode = vscode.workspace.getConfiguration('commitgpt').get<boolean>('pirateMode') || false;
                if (!diffOutput.stdout) {
                    if(pirateMode) {
                        vscode.window.showInformationMessage('Arr matey, no alterations be spotted. Ye need to stage yer new files afore ye can commit.');
                    } else {
                        vscode.window.showInformationMessage('No changes detected. Note: New files need to be staged before committing.');
                    }
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
                    const pirateModel = new OpenAI({
                        openAIApiKey: openaiAPIKey,
                        modelName: 'gpt-3.5-turbo',
                        temperature: 1
                    });
                    let defaultPrompt = "You are an expert at writing concise and detailed commit messages.\n" +
                    "Some examples of excellent commit messages are:\n" +
                    "Refactor: Simplify logic in calculateDiscount function\n" +
                    "Update: Add unit tests for the search functionality\n" +
                    "Fix: Correct error in pagination logic\n" +
                    "Add: Implement dark mode toggle\n" +
                    "Bump: Upgrade React version to 18.0.2\n" +
                    "Now generate a concise commit message based on the following 'git diff HEAD' output:\n\n" +
                    diffOutput.stdout +
                    "\n\nCommit message:";

                    changes = await model.call(defaultPrompt);

                    if (pirateMode) {
                        let piratePrompt = "You are Hagglin' Haddock, a pirate and seafarer that happens to be an expert at translating commit messages into pirate speak.\n" +
                        "Some examples of excellent commit messages you have translate into pirate speak:\n" +
                        "Overhaul: Untangle the cipherin' in the calculateDiscount function, ye scurvy dog!\n" +
                        "Chart Course: Conjure up cipherin' tests fer the searchin' capabilities, arrr!\n" +
                        "Shipshape: Right the mishap in the page-turnin' strategies, avast!\n" +
                        "Enlist: Hoist high the Jolly Roger for dark mode switch, shiver me timbers!\n" +
                        "Boost: Heave ho the React version to 18.0.2, arrr!!\n" +
                        "Translate this into heavy pirate speak:\n" + changes + "\n\nCommit message:";
                        changes = await pirateModel.call(piratePrompt);
                    }
                } else {
                    if(pirateMode) {
                        tag = "Brought t' ye by th' fine seafarers o'er at SID.ai!";
                    } else {
                        tag = 'Invocation sponsored by SID.ai';
                    }
                    //make call to our own proxy
                    const apiEndpoint = 'https://j5yyu4vgwwidqgtotflx5uc2ta0mxgld.lambda-url.us-east-1.on.aws/'; // replace with your API endpoint
                    const apiResponse = await axios.post(apiEndpoint, { content: diffOutput.stdout, pirateMode: pirateMode });
                    changes = apiResponse.data;
                }

                const commitMessage = `${changes} - ${tag}`;

                try {
                    const coauthor = 'Co-authored-by: CommitGPT by SID.ai <commitgpt@sid.ai>';
                    await exec(`git commit -a -m "${changes}" -m "${coauthor}"`, { cwd: workspacePath });
                    if (pirateMode) {
                        vscode.window.showInformationMessage(`Treasure stowed: ${commitMessage}`);
                    } else {
                        vscode.window.showInformationMessage(`Commit successful: ${commitMessage}`);
                    }
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
}


export function deactivate() {}
