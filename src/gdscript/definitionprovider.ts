import {
    DefinitionProvider,
    TextDocument,
    Position,
    CancellationToken,
    Definition,
    Location,
    workspace,
    Uri,
    Range
} from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import config from '../config';

class GDScriptDefinitionProivder implements DefinitionProvider {
    constructor() {

    }

    provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Definition | Thenable < Definition > {
        const isStr = (content:string) => (content.startsWith("'") || content.startsWith('"') || content.startsWith('@"') ) && (content.endsWith("'") || content.endsWith('"'));
        const getSelectedContent = ():string =>{
            const line = document.lineAt(position);
            const wordRange = document.getWordRangeAtPosition(position) ;
            const machs = line.text.match(/[A-z_]+[A-z_0-9]*|".*"|'.*'|@".*"/g)
            let res = line.text.substring(wordRange.start.character, wordRange.end.character);
            machs.map(m=>{
                if(m) {
                    if(isStr(m)){
                        res = m;
                        return;
                    }
                }
            });
            return res;
        };
        const getDefinitions = (content: string):Location[]| Location => {
            if(content.startsWith("res://")) {
                content = content.replace("res://", "");
                if(workspace && workspace.rootPath)
                    content = path.join(workspace.rootPath, content)
                return new Location(Uri.file(content), new Range(0,0,0,0));
            }
            else if(fs.existsSync(content) && fs.statSync(content).isFile()) {
                return new Location(Uri.file(content), new Range(0,0,0,0));
            }
            else {
                const workspaceSymbols = config.getAllSymbols();
                let locations: Location[] = [];
                // check from workspace
                for (let path of Object.keys(workspaceSymbols)) {
                    const script = workspaceSymbols[path];
                    let scriptitems: Location[] = [];
                    const checkDifinition = (items)=>{
                        const _items: Location[] = [];
                        for (let name of Object.keys(items)) {
                            if(name == content) {
                                _items.push(new Location(Uri.file(path), items[name]));
                            }
                        }
                        return _items;
                    }
                    scriptitems = [...scriptitems, ...checkDifinition(script.variables)];
                    scriptitems = [...scriptitems, ...checkDifinition(script.constants)];
                    scriptitems = [...scriptitems, ...checkDifinition(script.functions)];
                    scriptitems = [...scriptitems, ...checkDifinition(script.signals)];
                    scriptitems = [...scriptitems, ...checkDifinition(script.classes)];
                    locations = [...locations, ...scriptitems];
                }
                // check from builtin
                return locations;
            }
        };


        let selStr = getSelectedContent();
        if(selStr) {
            // For strings
            if(isStr(selStr)) {
                selStr = selStr.replace(/"|'|@"/g,"");
                let fpath = path.join(path.dirname(document.uri.fsPath), selStr)
                console.log(fpath);
                if(fs.existsSync(fpath) && fs.statSync(fpath).isFile())
                    selStr = fpath
            }
            return getDefinitions(selStr);
        }
        return null;
    }
}

export default GDScriptDefinitionProivder;