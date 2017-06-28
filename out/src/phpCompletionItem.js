const vscode = require("vscode");
const ext = require("./extension");
const path = require('path');
const fs = require('fs');

const PROPERTY_NORMAL = 0;
const PROPERTY_STATIC = 1;
const PROPERTY_CONST = 2;

exports.Indexer = {

    /** @var {Object} */
    phpFileUses: {},
    /** @var {Object} */
    phpFileFunctions: {},
    /** @var {Object} */
    phpFileStaticFunctions: {},
    /** @var {Object} */
    phpFileProperties: {},
    /** @var {Object} */
    done: {},
    


    /**
     * Gets all functions in a completion item form
     * 
     * @param {String} file 
     * @param {vscode.CompletionItem[]} suggestions 
     * @param {String} currentWord 
     * @param {String} execute 
     * @return {vscode.CompletionItem[]}
     */
    getFunctionsFromFile(file, suggestions, currentWord, execute) {
        for (var func in exports.Indexer.phpFileFunctions[file]) {
            func = exports.Indexer.phpFileFunctions[file][func];
            if (func.function.startsWith(currentWord) && execute[1] == currentWord && (func.functionModifiers["public"] || file == ext.currentPath)) {
                if(typeof exports.Indexer.done[func.function] == "undefined" /*|| exports.Indexer.done[func.function].params !== func.params */) { // Preventing from spamming same method over and over
                    var newSuggestion = new vscode.CompletionItem(func.function, vscode.CompletionItemKind.Function);
                    params = func.params;
                    var parameters = [];
                    params.forEach(function (value, key) {
                        if (value) {
                            params[key] = "$" + value[1];
                            parameters[key] = (typeof value[2] !== "undefined" ? value[2] + " " : "") + value[1];
                            parameters[key] += typeof value[3] !== "undefined" ? " = " + value[3] : "";
                        }
                    });
                    newSuggestion.insertText = func.function + "(" + params.join(", ") + ")";
                    newSuggestion.documentation = func.comment;
                    newSuggestion.detail = "(function) (" + parameters.join(", ") + ")";
                    suggestions.push(newSuggestion);
                    exports.Indexer.done[func.function] = func;
                }
            }
        };
        return suggestions;
    },

    /**
     * Returns all indexed static functions of file
     * 
     * @param {string} file 
     * @param {vscode.CompletionItem[]} suggestions 
     * @param {String} currentWord 
     * @param {String} executeStatic 
     * @return {vscode.CompletionItem[]}
     */
    getStaticFunctionsFromFile(file, suggestions, currentWord, executeStatic) {
        
        for (var func in exports.Indexer.phpFileStaticFunctions[file]) {
            func = exports.Indexer.phpFileStaticFunctions[file][func];
            if (func.function.startsWith(currentWord) && executeStatic[1] == currentWord) {
                if(typeof exports.Indexer.done[func.function] == "undefined" /*|| exports.Indexer.done[func.function].params !== func.params*/) { // Preventing from spamming same method over and over
                    var newSuggestion = new vscode.CompletionItem(func.function, vscode.CompletionItemKind.Function);
                    var params = func.params;
                    var parameters = [];
                    params.forEach(function (value, key) {
                        if (value) {
                            params[key] = "$" + value[1];
                            parameters[key] = (typeof value[2] !== "undefined" ? value[2] + " " : "") + value[1];
                            parameters[key] += typeof value[3] !== "undefined" ? " = " + value[3] : "";
                        }
                    })
                    newSuggestion.insertText = func.function + "(" + params.join(", ") + ")";
                    newSuggestion.documentation = func.comment;
                    newSuggestion.detail = "(function) (" + parameters.join(", ") + ")";
                    suggestions.push(newSuggestion);
                    exports.Indexer.done[func.function] = func;
                }
            }
        };
        return suggestions;
    },


    /**
     * Gets all properties in a completion item form
     * 
     * @param {String} file 
     * @param {vscode.CompletionItem[]} suggestions 
     * @param {String} currentWord 
     * @param {String} execute 
     * @return {vscode.CompletionItem[]}
     */
    getPropertiesFromFile(file, suggestions, currentWord, execute) {
        
        for (var func in exports.Indexer.phpFileProperties[file]) {
            func = exports.Indexer.phpFileProperties[file][func];
            if (func[0].startsWith(currentWord) && execute[1] == currentWord && func[1] == PROPERTY_NORMAL) {
                if(typeof exports.Indexer.done[func[0]] == "undefined") { // Preventing from spamming same method over and over
                    var newSuggestion = new vscode.CompletionItem(func[0], vscode.CompletionItemKind.Property);
                    newSuggestion.insertText = func[0];
                    newSuggestion.detail = "(property) " + file.substr(0, file.length - 4).replace(new RegExp("\/", "g"), "\\");
                    suggestions.push(newSuggestion);
                    exports.Indexer.done[func[0]] = true;
                }
            }
        };
        return suggestions;
    },

    /**
     * Returns all indexed static properties of file
     * 
     * @param {string} file 
     * @param {vscode.CompletionItem[]} suggestions 
     * @param {String} currentWord 
     * @param {String} executeStatic 
     * @return {vscode.CompletionItem[]}
     */
    getStaticPropertiesFromFile(file, suggestions, currentWord, executeStatic) {
        
        for (var func in exports.Indexer.phpFileProperties[file]) {
            func = exports.Indexer.phpFileProperties[file][func];
            if (func[0].startsWith(currentWord) && executeStatic[1] == currentWord) {
                if(typeof exports.Indexer.done[func[0]] == "undefined") { // Preventing from spamming same method over and over
                    if(func[1] == PROPERTY_STATIC){
                        var newSuggestion = new vscode.CompletionItem("$" + func[0], vscode.CompletionItemKind.Property);
                        newSuggestion.insertText = "$" + func[0];
                        newSuggestion.detail = "(property) " + file.substr(0, file.length - 4).replace(new RegExp("\/", "g"), "\\");
                        exports.Indexer.done[func[0]] = true;
                    } else if(func[1] == PROPERTY_CONST){
                        var newSuggestion = new vscode.CompletionItem(func[0], vscode.CompletionItemKind.Constant);
                        newSuggestion.insertText = func[0];
                        newSuggestion.detail = "(constant) " + file.substr(0, file.length - 4).replace(new RegExp("\/", "g"), "\\");
                        exports.Indexer.done[func[0]] = true;
                    }
                    if(newSuggestion) suggestions.push(newSuggestion);
                }
            }
        };
        return suggestions;
    },

    /**
     * Gets completion class for a file in format "use ns\class;"
     * 
     * @param {string} file 
     * @param {vscode.CompletionItem[]} suggestions 
     * @return {vscode.CompletionItem[]}
     */
    getClassUse(file, suggestions) {
        var currentClass = file.substr(0, file.length - 4);
        currentClass = currentClass.replace(new RegExp("\/", "g"), "\\");
        if (currentClass.startsWith("\\")) currentClass = currentClass.substr(1);
        var newSuggestion = new vscode.CompletionItem(currentClass, vscode.CompletionItemKind.Class);
        newSuggestion.detail = "(class) " + currentClass;
        newSuggestion.insertText = currentClass + ";\n";
        suggestions.push(newSuggestion);
        return suggestions;
    },

    /**
     * Gets a class completion (new instance) item from it's class name
     * 
     * @param {string} file 
     * @param {vscode.CompletionItem[]} suggestions 
     * @param {string} currentPath 
     * @param {array} clas 
     * @return {vscode.CompletionItem[]}
     * 
     */
    getClassNew(file, suggestions, currentPath, clas) {
        var currentClass = file.substr(0, file.length - 4).replace(new RegExp("\/", "g"), "\\");
        var params = [];
        if (typeof exports.Indexer.phpFileFunctions[file]["__construct"] !== "undefined") {
            params = exports.Indexer.phpFileFunctions[file]["__construct"].params;
        }
        params.forEach(function (value, key) {
            if (value) params[key] = "$" + value[2];
        });
        if (currentClass.startsWith("\\")) currentClass = currentClass.substr(1);
        var newSuggestion = new vscode.CompletionItem(currentClass, vscode.CompletionItemKind.Class);
        if (typeof clas[1] == "undefined" && 
            typeof exports.Indexer.phpFileUses[currentPath] !== "undefined" && 
            typeof exports.Indexer.phpFileUses[currentPath][currentClass] !== "undefined") {
            newSuggestion.insertText = currentClass.split("\\")[currentClass.split("\\").length - 1] + "(" + params.join(", ") + ");";
        } else {
            newSuggestion.insertText = "\\" + currentClass + "(" + params.join(", ") + ");";
        }
        newSuggestion.detail = "(class) " + currentClass;
        suggestions.push(newSuggestion);
        return suggestions;
    },



    /**
     * Gets a class completion (static class) item from it's class name
     * 
     * @param {string} file 
     * @param {vscode.CompletionItem[]} suggestions 
     * @param {string} currentPath 
     * @return {vscode.CompletionItem[]}
     * 
     */
    getClassNormal(file, suggestions, currentPath) {
        var currentClass = file.substr(0, file.length - 4).replace(new RegExp("\/", "g"), "\\");
        var currentPath2 = currentPath.substr(1);
        currentClass = currentClass.replace(new RegExp("\/", "g"), "\\");
        if (currentClass.startsWith("\\")) currentClass = currentClass.substr(1);
        var newSuggestion = new vscode.CompletionItem(currentClass, vscode.CompletionItemKind.Class);
        newSuggestion.detail = "(class) " + currentClass;
        if (typeof exports.Indexer.phpFileUses[currentPath] !== "undefined" && 
        typeof exports.Indexer.phpFileUses[currentPath][currentClass] !== "undefined") {
            newSuggestion.insertText = currentClass.split("\\")[currentClass.split("\\").length - 1];
        } else {
            newSuggestion.insertText = "\\" + currentClass;
        }
        suggestions.push(newSuggestion);
        return suggestions;
    },



    /**
     * Funcion that handles PHP file registering.
     * 
     * @return {Void} 
     */
    indexPhpFiles() {
        // Clear out the cached data
        exports.Indexer.phpFileUses = {};
        exports.Indexer.phpFileFunctions = {};
        exports.Indexer.phpFileStaticFunctions = {};
        exports.Indexer.phpFileProperties = {};
        var libraryResult = [];
        if (fs.existsSync(vscode.workspace.getConfiguration('php')['pocketMinePath'])) {
            libraryResult = exports.Indexer.findFilesInDir(vscode.workspace.getConfiguration('php')['pocketMinePath'], ".php");
        }
        if (vscode.workspace.rootPath !== undefined) {
            var c = exports.Indexer.findFilesInDir(vscode.workspace.rootPath, ".php");
            libraryResult = libraryResult.concat(c);
        }
        libraryResult.forEach(function (path) {
            if (fs.existsSync(path)) {
                var fileName = path.replace(vscode.workspace.rootPath, "").replace(vscode.workspace.getConfiguration('php')['pocketMinePath'], "").replace("src", "").slice(1);
                if (typeof exports.Indexer.phpFileFunctions[fileName] == "undefined") {
                    exports.Indexer.phpFileFunctions[fileName] = {};
                }
                if (typeof exports.Indexer.phpFileStaticFunctions[fileName] == "undefined") {
                    exports.Indexer.phpFileStaticFunctions[fileName] = {};
                }
                if (typeof exports.Indexer.phpFileUses[fileName] == "undefined") {
                    exports.Indexer.phpFileUses[fileName] = {};
                }
                if (typeof exports.Indexer.phpFileProperties[fileName] == "undefined") {
                    exports.Indexer.phpFileProperties[fileName] = {};
                }
                // Read through the PHP file for includes/requires and function definitions
                var read = fs.readFileSync(path, 'utf8');
                // Parsing class regexr
                var fileBaseName = (path.indexOf("/") ? path.split("/") : (path.indexOf("\\") ? path.split("\\") : [path]));
                fileBaseName = fileBaseName[fileBaseName.length - 1].replace(/\.php$/, "");
                if(!read.match(new RegExp("(class|interface)\\s+" + fileBaseName, "mi"))) return;
                // var classRegexr = new RegExp("(class|interface)\\s+" + fileBaseName + "(\\s+extends ([\w_]+))?(\\s+implements ([\w_\\\\]+))?", "mi");
                try {
                    var lineReader = read.split("\n");
                    lineReader.forEach(function (line) {
                        // Parsing functions:
                        exports.Indexer.parseFunction(line, fileName);
                        // Parsing properties:
                        exports.Indexer.parseProperty(line, fileName);
                        // Check for uses
                        exports.Indexer.parseUse(line, fileName);
                    });
                } catch (err) {
                    console.error(err);
                }
            }
        });
    },



    /**
     * Find all files recursively in specific folder with specific extension, e.g:
     * findFilesInDir('./project/src', '.html') ==> ['./project/src/a.html','./project/src/build/index.html']
     * @param  {String} startPath    Path relative to exports.Indexer file or other file which requires exports.Indexer files
     * @param  {String} filter       Extension name, e.g: '.html'
     * @return {Array}               Result files with path string in an array
     */
    findFilesInDir(startPath, filter) {

        var results = [];

        if (!fs.existsSync(startPath)) {
            console.log("no dir ", startPath);
            return;
        }

        var files = fs.readdirSync(startPath);
        for (var i = 0; i < files.length; i++) {
            var filename = path.join(startPath, files[i]);
            var stat = fs.lstatSync(filename);
            if (stat.isDirectory()) {
                results = results.concat(exports.Indexer.findFilesInDir(filename, filter)); //recurse
            }
            else if (filename.indexOf(filter) >= 0) {
                results.push(filename);
            }
        }
        return results;
    },


	/**
	 * Parses and exports.Indexer functions from a line.
	 * @param {String} line 
	 * @param {String} fileName 
	 */
    parseFunction(line, fileName) {
        // Thats a bit messy for exports.Indexer one so: $2 = optionnal description comment, $4 = functions specifications (static, public, abstract, final,...), $7 = function name, $8 = arguments, $14 = return of function
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
            functionModifiersLitteral.forEach(function (modifier) {
                functionModifiers[modifier] = true;
            })
            var comment = typeof match[3] !== "undefined" ? match[3].replace(/[*]/gim, "") : "From " + fileName;
            // Parameters
            var params = [];
            if (typeof match[8] !== "undefined") match[8].replace(/\s*,\s*/, ",").split(",").forEach(function (m) {
                var paramers = /((\w+)\s+)?(\$\w+)(\s*\=[^,)]+)?/.exec(m)
                if (typeof paramers !== "undefined" && paramers !== null) params.push([paramers[0], paramers[3], paramers[2], paramers[5]]); // Later use of knowning which equals to what.
            });
            // Exporting function
            if (!functionModifiers.static) {
                exports.Indexer.phpFileFunctions[fileName][match[7]] = {
                    function: match[7],
                    params: params,
                    functionModifiers: functionModifiers,
                    comment: comment
                };
            } else {
                exports.Indexer.phpFileStaticFunctions[fileName][match[7]] = {
                    function: match[7],
                    params: params,
                    functionModifiers: functionModifiers,
                    comment: comment
                };
            }
        }
    },


	/**
	 * Parses and exports.Indexer uses from a line.
	 * @param {String} line 
	 * @param {String} fileName 
	 */
    parseUse(line, fileName) {
        var includeRegex = /use\s+((\w+\\)*)(\w+)(\s+as\s+(\w+)\s*)?;/;
        match = includeRegex.exec(line);
        if (match) {
            // Check if there is a match of "as" to set it.
            var classType = '';
            if (typeof match[4] !== "undefined") {
                classType = match[5];
            } else {
                classType = match[3];
            }
            exports.Indexer.phpFileUses[fileName][match[1] + match[3]] = classType;
        }
    },


	/**
	 * Parses and exports Indexer properties (also static one) from a line.
	 * @param {String} line 
	 * @param {String} fileName 
	 */
    parseProperty(line, fileName) {
        var propertiesRegexr = /(protected|private|public|static|const)\s+(\$)?([\w_]+)\s*(;|=)/;
        match = propertiesRegexr.exec(line);
        if (match) {
            if(match[1] == "static" && match[2] == "$") {
                exports.Indexer.phpFileProperties[fileName][match[3]] = [match[3], PROPERTY_STATIC];
            } else if(match[1] == "const") {
                exports.Indexer.phpFileProperties[fileName][match[3]] = [match[3], PROPERTY_CONST];
            } else {
                exports.Indexer.phpFileProperties[fileName][match[3]] = [match[3], PROPERTY_NORMAL];
            }
        }
    },
}