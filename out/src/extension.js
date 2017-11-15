/**
 * Main file for extension
 * Almost entiry rewritten by (C) Ad5001 2017
 */

'use strict';
const vscode = require('vscode');
// const phpFuncSuggestion = require('./phpFunctionSuggestions');
const Indexer = (require('./phpCompletionItem')).Indexer;
exports.PHP_MODE = { language: 'php', scheme: 'file' };
exports.currentPath = "";


/**
 * Initial extension activation
 * 
 * @param {*} context 
 */
function activate(context) {
    // Do the initial indexing
    Indexer.indexPhpFiles();

    // require("fs").appendFileSync("/home/ad5001/echo.txt", JSON.stringify(Indexer.phpFileProperties))
    vscode.workspace.onDidSaveTextDocument(function(document) {
        Indexer.indexPhpFiles();
    });

    // Setup our class as a compvarion item provider for function autocompvare
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(exports.PHP_MODE, {
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

            // Checking for commun regexps
            var clas = /new\s+(\\)?(\w+)(\\\w+)*/.exec(lineText);
            var use = /use\s+(\w+)(\\\w+)*/.exec(lineText);
            var execute = /->(\w+)/.exec(lineText);
            var executeStatic = /::(\w+)/.exec(lineText);
            var classInFunc = /(\(|,\s*)((\\\w+)+)/.exec(lineText);

            // Check through the list of functions that are included in this file and see if any match
            // the starting varter of the word we have so far
            var suggestions = [];

            // Check what files the current document includes/requires
            var currentFileName = document.uri.fsPath.replace(vscode.workspace.rootPath, '').slice(1);
            var currentPath = document.uri.fsPath.replace(vscode.workspace.rootPath, '').replace("src/", "");

            // Look through all included/required files for the current document
            for (var f in Indexer.phpFileFunctions) {
                // Checking normal functions
                if (execute) {
                    suggestions = Indexer.getFunctionsFromFile(f, suggestions, currentWord, execute);
                    suggestions = Indexer.getPropertiesFromFile(f, suggestions, currentWord, execute);
                }

                // Checking static functions
                if (executeStatic) {
                    suggestions = Indexer.getStaticFunctionsFromFile(f, suggestions, currentWord, executeStatic);
                    suggestions = Indexer.getStaticPropertiesFromFile(f, suggestions, currentWord, executeStatic);
                }

                // Checking for class name
                if (f.indexOf(currentWord) > 0) {
                    // New instance
                    if (clas && (clas[2] == currentWord || clas[3] == "\\" + currentWord)) {
                        suggestions = Indexer.getClassNew(f, suggestions, currentPath, clas);
                    } else if (use && (use[1] == currentWord || use[2] == "\\" + currentWord)) { // Use
                        suggestions = Indexer.getClassUse(f, suggestions);
                    } else if (!(execute && execute[1] == currentWord) && !(executeStatic && executeStatic[1] == currentWord)) { // static classes
                        suggestions = Indexer.getClassNormal(f, suggestions, currentPath);
                    }
                }
            };
            Indexer.done = {}; // Reseting cache
            return suggestions;
        }
    }));

    // Setup our plugin to help with function signatures
    // context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(exports.PHP_MODE, new phpFuncSuggestion.PhpSignatureHelpProvider(vscode.workspace.getConfiguration('php')['docsTool']), '(', ','));

    // Commands registered by plugin
    /**
     * Reindex php files command
     */
    var indexDisposable = vscode.commands.registerCommand('pmide.indexPhpFiles', function() {
        Indexer.indexPhpFiles();
    });
    /**
     * Prints everything about PHP files.
     */
    var printDisposable = vscode.commands.registerCommand('pmide.printPhpFiles', function() {
        console.log(Object.keys(Indexer.phpFileFunctions).length);
        console.log(Indexer.phpFileUses, Indexer.phpFileFunctions);
    });
    context.subscriptions.push(indexDisposable);
    context.subscriptions.push(printDisposable);
}
exports.activate = activate;


exports.deactivate = function() {};