import * as vscode from "vscode";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("freedraw.startDrawing", () => {
      const panel = vscode.window.createWebviewPanel(
        "webview",
        "Free Draw",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "dist")),
          ],
        }
      );

      // Get path to resource on disk
      const webRoot = vscode.Uri.file(path.join(context.extensionPath, "dist"));

      // And get the special URI to use with the webview
      const scriptSrc = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(webRoot, "index.js")
      );
      const cssSrc = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(webRoot, "index.css")
      );
      const faviconSrc = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(webRoot, "assets", "favicon.png")
      );

      panel.webview.html = /*html*/ `
        <!doctype html>
        <html lang="en">

        <head>
          <meta charset="UTF-8" />
          <link rel="icon" type="image/svg+xml" href="${faviconSrc}" />
          <link rel="stylesheet" href="${cssSrc}">
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Free Draw</title>
        </head>

        <body style="margin: 0; padding: 0;">
          <div id="root"></div>
          <script type="module" src="${scriptSrc}"></script>
        </body>

        </html>
      `;
    })
  );
}

export function deactivate() {}
