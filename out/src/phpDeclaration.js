/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
const vscode = require('vscode');
const cp = require('child_process');
const path = require('path');
function definitionLocation(document, position, toolForDocs, includeDocs = true) {
    return getGoVersion().then((ver) => {
        if (!ver) {
            return Promise.resolve(null);
        }
        if (toolForDocs === 'godoc' || ver.major < 1 || (ver.major === 1 && ver.minor < 6)) {
            return definitionLocation_godef(document, position, includeDocs);
        }
        return definitionLocation_gogetdoc(document, position);
    });
}
exports.definitionLocation = definitionLocation;
function definitionLocation_godef(document, position, includeDocs = true) {
    return new Promise((resolve, reject) => {
        let wordAtPosition = document.getWordRangeAtPosition(position);
        let offset = byteOffsetAt(document, position);
        let godef = getBinPath('godef');
        // Spawn `godef` process
        let p = cp.execFile(godef, ['-t', '-i', '-f', document.fileName, '-o', offset.toString()], {}, (err, stdout, stderr) => {
            try {
                if (err && err.code === 'ENOENT') {
                    promptForMissingTool('godef');
                }
                if (err) {
                    console.log(err);
                    return resolve(null);
                }
                ;
                let result = stdout.toString();
                let lines = result.split('\n');
                let match = /(.*):(\d+):(\d+)/.exec(lines[0]);
                if (!match) {
                    // TODO: Gotodef on pkg name:
                    // /usr/local/go/src/html/template\n
                    return resolve(null);
                }
                let [_, file, line, col] = match;
                let signature = lines[1];
                let godoc = getBinPath('godoc');
                let pkgPath = path.dirname(file);
                let definitionInformation = {
                    file: file,
                    line: +line - 1,
                    column: +col - 1,
                    declarationlines: lines.splice(1),
                    toolUsed: 'godef',
                    doc: null,
                    name: null
                };
                if (!includeDocs) {
                    return resolve(definitionInformation);
                }
                cp.execFile(godoc, [pkgPath], {}, (err, stdout, stderr) => {
                    if (err && err.code === 'ENOENT') {
                        vscode.window.showInformationMessage('The "godoc" command is not available.');
                    }
                    let godocLines = stdout.toString().split('\n');
                    let doc = '';
                    let sigName = signature.substring(0, signature.indexOf(' '));
                    let sigParams = signature.substring(signature.indexOf(' func') + 5);
                    let searchSignature = 'func ' + sigName + sigParams;
                    for (let i = 0; i < godocLines.length; i++) {
                        if (godocLines[i] === searchSignature) {
                            while (godocLines[++i].startsWith('    ')) {
                                doc += godocLines[i].substring(4) + '\n';
                            }
                            break;
                        }
                    }
                    if (doc !== '') {
                        definitionInformation.doc = doc;
                    }
                    return resolve(definitionInformation);
                });
            }
            catch (e) {
                reject(e);
            }
        });
        p.stdin.end(document.getText());
    });
}
function definitionLocation_gogetdoc(document, position) {
    return new Promise((resolve, reject) => {
        let wordAtPosition = document.getWordRangeAtPosition(position);
        let offset = byteOffsetAt(document, position);
        let gogetdoc = getBinPath('gogetdoc');
        let p = cp.execFile(gogetdoc, ['-u', '-json', '-modified', '-pos', document.fileName + ':#' + offset.toString()], {}, (err, stdout, stderr) => {
            try {
                if (err && err.code === 'ENOENT') {
                    promptForMissingTool('gogetdoc');
                }
                if (err) {
                    console.log(err);
                    return resolve(null);
                }
                ;
                let goGetDocOutput = JSON.parse(stdout.toString());
                let match = /(.*):(\d+):(\d+)/.exec(goGetDocOutput.pos);
                let definitionInfo = {
                    file: null,
                    line: 0,
                    column: 0,
                    toolUsed: 'gogetdoc',
                    declarationlines: goGetDocOutput.decl.split('\n'),
                    doc: goGetDocOutput.doc,
                    name: goGetDocOutput.name
                };
                if (!match) {
                    return resolve(definitionInfo);
                }
                let [_, file, line, col] = match;
                definitionInfo.file = match[1];
                definitionInfo.line = +match[2] - 1;
                definitionInfo.column = +match[3] - 1;
                return resolve(definitionInfo);
            }
            catch (e) {
                reject(e);
            }
        });
        let documentText = document.getText();
        let documentArchive = document.fileName + '\n';
        documentArchive = documentArchive + Buffer.byteLength(documentText) + '\n';
        documentArchive = documentArchive + documentText;
        p.stdin.end(documentArchive);
    });
}
class GoDefinitionProvider {
    constructor(toolForDocs) {
        this.toolForDocs = 'godoc';
        this.toolForDocs = toolForDocs;
    }
    provideDefinition(document, position, token) {
        return definitionLocation(document, position, this.toolForDocs, false).then(definitionInfo => {
            if (definitionInfo == null || definitionInfo.file == null)
                return null;
            let definitionResource = vscode.Uri.file(definitionInfo.file);
            let pos = new vscode.Position(definitionInfo.line, definitionInfo.column);
            return new vscode.Location(definitionResource, pos);
        });
    }
}
exports.GoDefinitionProvider = GoDefinitionProvider;
//# sourceMappingURL=phpDeclaration.js.map