import * as vscode from 'vscode';

class Filter {

    private getPatterns(): Array<string> {
        return vscode.workspace.getConfiguration('log-wizard').get('pattern', [""]);
    }
    protected showError(text: string) {
        vscode.window.showErrorMessage(text);
    }
    protected showInfo(text: string) {
        vscode.window.showInformationMessage(text);
    }
    public apply(filePath: string | undefined) {
        const readline = require('readline');
        const fs = require('fs');
        var path = require('path');

        if (filePath === undefined) {
            this.showError("Path not valid");
            return;
        }

        // special path tail
        let ext = path.extname(filePath);
        let tail = '.cleaned' + ext;

        // overwrite mode ?
        let isOverwriteMode = filePath.indexOf(tail) !== -1;

        let outputPath = '';
        if (isOverwriteMode) {
            outputPath = filePath;

            // change input path
            let newInputPath = filePath + Math.floor(Date.now() / 1000) + ext;
            try {
                if (fs.existsSync(newInputPath)) {
                    fs.unlinkSync(newInputPath);
                }
            } catch (e) {
                this.showError('unlink error : ' + e);
                return;
            }
            try {
                fs.renameSync(filePath, newInputPath);
            } catch (e) {
                this.showError('rename error : ' + e);
                return;
            }
            console.log('after rename');
            filePath = newInputPath;
        } else {
            outputPath = filePath + tail;

            if (fs.existsSync(outputPath)) {
                console.log('output file already exist, force delete when not under overwrite mode');
                let tmpPath = outputPath + Math.floor(Date.now() / 1000) + ext;
                try {
                    fs.renameSync(outputPath, tmpPath);
                    fs.unlinkSync(tmpPath);
                } catch (e) {
                    console.log('remove error : ' + e);
                }
            }
        }

        console.log('overwrite mode: ' + (isOverwriteMode ? 'on' : 'off'));
        console.log('input path: ' + filePath);
        console.log('output path: ' + outputPath);

        // open write file
        let writeStream = fs.createWriteStream(outputPath);
        writeStream.on('open', () => {
            console.log('write stream opened');

            // open read file
            const readLine = readline.createInterface({
                input: fs.createReadStream(filePath)
            });

            const patterns = this.getPatterns();
            console.log("Patterns:" + patterns.join("|"));

            // filter line by line
            readLine.on('line', (line: string) => {
                let regex = RegExp(patterns.join("|"), 'g');
                let fixedLine = line.replace(regex, '');
                writeStream.write(fixedLine + '\n');
            }).on('close', () => {
                this.showInfo('Filter completed :)');
                writeStream.close();

                try {
                    if (isOverwriteMode) {
                        fs.unlinkSync(filePath);
                    }
                } catch (e) {
                    console.log(e);
                }
                vscode.workspace.openTextDocument(outputPath).then((doc: vscode.TextDocument) => {
                    vscode.window.showTextDocument(doc);
                });
            });
        }).on('error', (e: Error) => {
            console.log('can not open write stream : ' + e);
        }).on('close', () => {
            console.log('closed');
        });
    }
}
export { Filter };