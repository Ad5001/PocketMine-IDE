'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const phpMode_1 = require('./phpMode');
const phpFunctionSuggestions_1 = require('./phpFunctionSuggestions');
exports.phpFileFunctions = {};
exports.phpFileStaticFunctions = {};
exports.phpFileUses = {};
exports.PHP_MODE = { language: 'php', scheme: 'file' };
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Do the initial indexing
    indexPhpFiles();
    console.log(exports.phpFileFunctions);
    console.log(Object.keys(exports.phpFileUses));
    vscode.workspace.onDidSaveTextDocument(function(document) {
        indexPhpFiles();
    });
    // Setup our class as a compvarion item provider for function autocompvare
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(phpMode_1.PHP_MODE, {
        provideCompletionItems(document, position, token) {
            var filename = document.fileName;
            var lineText = document.lineAt(position.line).text;
            var lineTillCurrentPosition = lineText.substr(0, position.character);
            var wordAtPosition = document.getWordRangeAtPosition(position);
            var currentWord = '';
            if (wordAtPosition && wordAtPosition.start.character < position.character) {
                var word = document.getText(wordAtPosition);
                currentWord = word.substr(0, position.character - wordAtPosition.start.character);
            }

            var clas = /new\s+(\\)?(\w+)(\\\w+)*/.exec(lineText);
            var use = /use\s+(\w+)(\\\w+)*/.exec(lineText);
            var execute = /->(\w+)/.exec(lineText);
            var executeStatic = /::(\w+)/.exec(lineText);
            // Check through the list of functions that are included in this file and see if any match
            // the starting varter of the word we have so far
            var suggestions = [];
            // Check what files the current document includes/requires
            var currentFileName = document.uri.fsPath.replace(vscode.workspace.rootPath, '').slice(1);
            var currentPath = document.uri.fsPath.replace(vscode.workspace.rootPath, '').replace("src/", "");
            // Look through all included/required files for the current document
            for (var f in exports.phpFileFunctions) {
                // Checking normal functions
                if (execute)
                    for (var func in exports.phpFileFunctions[f]) {
                        func = exports.phpFileFunctions[f][func];
                        if (func.function.indexOf(currentWord) > 0 && execute[1] == currentWord && (func.functionModifiers["public"] || f == currentPath)) {
                            var newSuggestion = new vscode.CompletionItem(func.function, vscode.CompletionItemKind.Function);
                            params = func.params;
                            var parameters = [];
                            params.forEach(function(value, key) {
                                if (value) {
                                    params[key] = "$" + value[1];
                                    parameters[key] = (typeof value[2] !== "undefined" ? value[2] + " " : "") + value[1];
                                    parameters[key] += typeof value[3] !== "undefined" ? " = " + value[3] : "";
                                }
                            });
                            newSuggestion.insertText = func.function+"(" + params.join(", ") + ")";
                            newSuggestion.documentation = func.comment;
                            newSuggestion.detail = "(" + parameters.join(", ") + ")";
                            suggestions.push(newSuggestion);
                        }
                    };
                // Checking static functions
                if (executeStatic)
                    for (var func in exports.phpFileStaticFunctions[f]) {
                        func = exports.phpFileStaticFunctions[f][func];
                        if (func.function.indexOf(currentWord) > 0 && executeStatic[1] == currentWord) {
                            var newSuggestion = new vscode.CompletionItem(func.function, vscode.CompletionItemKind.Function);
                            var params = func.params;
                            var parameters = [];
                            params.forEach(function(value, key) {
                                if (value) {
                                    params[key] = "$" + value[1];
                                    parameters[key] = (typeof value[2] !== "undefined" ? value[2] + " " : "") + value[1];
                                    parameters[key] += typeof value[3] !== "undefined" ? " = " + value[3] : "";
                                }
                            })
                            newSuggestion.insertText = func.function+"(" + params.join(", ") + ")";
                            newSuggestion.documentation = func.comment;
                            newSuggestion.detail = "(" + parameters.join(", ") + ")";
                            suggestions.push(newSuggestion);
                        }
                    };
                if (f.indexOf(currentWord) > 0) {
                    if (clas && (clas[2] == currentWord || clas[3] == "\\" + currentWord)) { // New instance
                        var currentClass = f.substr(0, f.length - 4).replace(new RegExp("\/", "g"), "\\");
                        var params = [];
                        if (typeof exports.phpFileFunctions[f]["__construct"] !== "undefined") {
                            params = exports.phpFileFunctions[f]["__construct"].params;
                        }
                        params.forEach(function(value, key) {
                            if (value) params[key] = "$" + value[1];
                        });
                        if (currentClass.startsWith("\\")) currentClass = currentClass.substr(1);
                        var newSuggestion = new vscode.CompletionItem(currentClass, vscode.CompletionItemKind.Class);
                        if (typeof clas[1] == "undefined" && typeof exports.phpFileUses[currentPath] !== "undefined" && typeof exports.phpFileUses[currentPath][currentClass] !== "undefined") {
                            newSuggestion.insertText = currentClass.split("\\")[currentClass.split("\\").length - 1] + "(" + params.join(", ") + ");";
                        } else {
                            newSuggestion.insertText = "\\" + currentClass + "(" + params.join(", ") + ");";
                        }
                        newSuggestion.detail = "Class " + currentClass;
                        suggestions.push(newSuggestion);
                    } else if (use && (use[1] == currentWord || use[2] == "\\" + currentWord)) { // Use
                        var currentClass = f.substr(0, f.length - 4);
                        currentClass = currentClass.replace(new RegExp("\/", "g"), "\\");
                        if (currentClass.startsWith("\\")) currentClass = currentClass.substr(1);
                        var newSuggestion = new vscode.CompletionItem(currentClass, vscode.CompletionItemKind.Class);
                        newSuggestion.detail = "Class " + currentClass;
                        newSuggestion.insertText = currentClass + ";\n";
                        suggestions.push(newSuggestion);
                    } else if (!(execute && execute[1] == currentWord) && !(executeStatic && executeStatic[1] == currentWord)) { // static classes
                        var currentClass = f.substr(0, f.length - 4);
                        currentClass = currentClass.replace(new RegExp("\/", "g"), "\\");
                        if (currentClass.startsWith("\\")) currentClass = currentClass.substr(1);
                        var newSuggestion = new vscode.CompletionItem(currentClass, vscode.CompletionItemKind.Class);
                        newSuggestion.detail = "Class " + currentClass;
                        if (typeof exports.phpFileUses[currentPath] !== "undefined" && typeof exports.phpFileUses[currentPath][currentClass] !== "undefined") {
                            newSuggestion.insertText = currentClass.split("\\")[currentClass.split("\\").length - 1] + "::";
                        } else {
                            newSuggestion.insertText = "\\" + currentClass + "::";
                        }
                        suggestions.push(newSuggestion);
                    }
                }
            };
            return suggestions;
        }
    }));
    // Setup our plugin to help with function signatures
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(phpMode_1.PHP_MODE, new phpFunctionSuggestions_1.PhpSignatureHelpProvider(vscode.workspace.getConfiguration('php')['docsTool']), '(', ','));
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var indexDisposable = vscode.commands.registerCommand('pmide.indexPhpFiles', () => {
        // The code you place here will be executed every time your command is executed
        indexPhpFiles();
    });
    var printDisposable = vscode.commands.registerCommand('pmide.printPhpFiles', () => {
        console.log(Object.keys(exports.phpFileFunctions).length);
        console.log(exports.phpFileUses);
    });
    context.subscriptions.push(indexDisposable);
    context.subscriptions.push(printDisposable);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;





// Function to handle the indexing of PHP files
function indexPhpFiles() {
    // Clear out the cached data
    exports.phpFileUses = {};
    exports.phpFileFunctions = {};
    var indexResult = vscode.workspace.findFiles("**/*.php", "", 1000).then(function(list) {
        if (list) {
            var p = new Promise(function(resolve, reject) {
                list.forEach((phpFile) => {
                    var path = phpFile.fsPath;
                    var fileName = path.replace(vscode.workspace.rootPath, "").replace("src/", "").slice(1);
                    if (!(fileName in exports.phpFileFunctions)) {
                        exports.phpFileFunctions[fileName] = [];
                    }
                    if (!(fileName in exports.phpFileStaticFunctions)) {
                        exports.phpFileStaticFunctions[fileName] = [];
                    }
                    // Read through the PHP file for includes/requires and function definitions
                    var read = require('fs').readFileSync(path, 'utf8');
                    var lineReader = read.split("\n");
                    try {
                        lineReader.forEach(function(line) {
                            // Thats a bit messy for this one so: $2 = optionnal description comment, $4 = functions specifications (static, public, abstract, final,...), $7 = function name, $8 = arguments, $14 = return of function
                            var functionRegex = /(\/\*\*?((\s|.|\n)+)\*\/)?\s*(((abstract|public|protected|private|final|static)\s*)*)function\s+(\w+)\(((\s*\w+)?\s*\$\w+\s*(,(\s*\w+)?\s*\$\w+\s*)*\s*)?\)\s*(:\s*(\w+)\s*)?({|;)/mig
                            var match = functionRegex.exec(line);
                            if (match) {
                                // Matching function modifiers
                                var functionModifiersLitteral = match[4].replace(/\s/, " ").split(" ");
                                var functionModifiers = {
                                    "abstract": false,
                                    "public": false,
                                    "protected": false,
                                    "private": false,
                                    "final": false,
                                    "static": false
                                };
                                functionModifiersLitteral.forEach(function(modifier) {
                                    functionModifiers[modifier] = true;
                                })
                                var comment = typeof match[3] !== "undefined" ? match[3].replace(/[*]/gim, "") : "From " + fileName;
                                // Parameters
                                var params = [];
                                if (typeof match[8] !== "undefined") match[8].replace(/\s*,\s*/, ",").split(",").forEach(function(m) {
                                    var paramers = /((\w+)\s+)?(\$\w+)(\s*\=[^,)]+)?/.exec(m)
                                    if (typeof paramers !== "undefined" && paramers !== null) params.push([paramers[0], paramers[3], paramers[2], paramers[5]]); // Later use of knowning which equals to what.
                                });
                                // Exporting function
                                if (!functionModifiers.static) {
                                    exports.phpFileFunctions[fileName][match[7]] = {
                                        function: match[7],
                                        params: params,
                                        functionModifiers: functionModifiers,
                                        comment: comment
                                    };
                                } else {
                                    exports.phpFileStaticFunctions[fileName][match[7]] = {
                                        function: match[7],
                                        params: params,
                                        functionModifiers: functionModifiers,
                                        comment: comment
                                    };
                                }
                            }
                            // Check for uses
                            var includeRegex = /use\s+((\w+\\)*)(\w+)(\s+as\s+(\w+)\s*)?;/;
                            match = includeRegex.exec(line);
                            if (match) {
                                if (!(fileName in exports.phpFileUses)) {
                                    exports.phpFileUses[fileName] = [];
                                }
                                // Check if there is a match of "as" to set it.
                                var classType = '';
                                if (typeof match[4] !== "undefined") {
                                    classType = match[5];
                                } else {
                                    classType = match[3];
                                }
                                exports.phpFileUses[fileName][match[1] + match[3]] = classType;
                            }
                        });
                    } catch (e) {
                        console.error(e);
                    }
                });
            })
        } else {
            console.log("No workspace defined");
        }
    }, function(reason) {
        console.log("Error: " + reason);
    });

    // Libraries
    if (require('fs').existsSync(vscode.workspace.getConfiguration('php')['pocketMinePath'])) {
        var libraryResult = require("child_process").execSync("find " + vscode.workspace.getConfiguration('php')['pocketMinePath'] + " -maxdepth 10 -type f | fgrep .php").toString().split("\n");
        if (libraryResult) {
            libraryResult.forEach(function(path) {
                if (require('fs').existsSync(path)) {
                    var fileName = path.replace(vscode.workspace.getConfiguration('php')['pocketMinePath'], "").slice(1);
                    if (!(fileName in exports.phpFileFunctions)) {
                        exports.phpFileFunctions[fileName] = {};
                    }
                    if (!(fileName in exports.phpFileStaticFunctions)) {
                        exports.phpFileStaticFunctions[fileName] = [];
                    }
                    // Read through the PHP file for includes/requires and function definitions
                    var read = require('fs').readFileSync(path, 'utf8');
                    try {
                        var lineReader = read.split("\n");
                        lineReader.forEach(function(line) {
                            // Thats a bit messy for this one so: $2 = optionnal description comment, $4 = functions specifications (static, public, abstract, final,...), $7 = function name, $8 = arguments, $14 = return of function
                            var functionRegex = /(\/\*\*?((\s|.|\n)+)\*\/)?\s*(((abstract|public|protected|private|final|static)\s*)*)function\s+(\w+)\(((\s*\w+)?\s*\$\w+\s*(,(\s*\w+)?\s*\$\w+\s*)*\s*)?\)\s*(:\s*(\w+)\s*)?({|;)/mig
                            var match = functionRegex.exec(line);
                            if (match) {
                                // Matching function modifiers
                                var functionModifiersLitteral = match[4].replace(/\s/, " ").split(" ");
                                var functionModifiers = {
                                    "abstract": false,
                                    "public": false,
                                    "protected": false,
                                    "private": false,
                                    "final": false,
                                    "static": false
                                };
                                functionModifiersLitteral.forEach(function(modifier) {
                                    functionModifiers[modifier] = true;
                                })
                                var comment = typeof match[3] !== "undefined" ? match[3].replace(/[*]/gim, "") : "From " + fileName;
                                // Parameters
                                var params = [];
                                if (typeof match[8] !== "undefined") match[8].replace(/\s*,\s*/, ",").split(",").forEach(function(m) {
                                    var paramers = /((\w+)\s+)?(\$\w+)(\s*\=[^,)]+)?/.exec(m)
                                    if (typeof paramers !== "undefined" && paramers !== null) params.push([paramers[0], paramers[3], paramers[2], paramers[5]]); // Later use of knowning which equals to what.
                                });
                                // Exporting function
                                if (!functionModifiers.static) {
                                    exports.phpFileFunctions[fileName][match[7]] = {
                                        function: match[7],
                                        params: params,
                                        functionModifiers: functionModifiers,
                                        comment: comment
                                    };
                                } else {
                                    exports.phpFileStaticFunctions[fileName][match[7]] = {
                                        function: match[7],
                                        params: params,
                                        functionModifiers: functionModifiers,
                                        comment: comment
                                    };
                                }
                            }
                        });
                    } catch (err) {
                        console.error(err); // Fails silently later
                    }
                }
            });
        } else {
            console.log("No workspace defined");
        }
    }
}
//# sourceMappingURL=extension.js.map