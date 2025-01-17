import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

const isDev = process.env.NODE_ENV === "development";

function getWebviewContent(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
) {
  const filePath: vscode.Uri = vscode.Uri.file(
    path.join(
      context.extensionPath,
      isDev ? "src" : "dist",
      "canvas",
      "index.html"
    )
  );
  let html = fs.readFileSync(filePath.fsPath, "utf8");

  const webviewUri = (file: string) =>
    panel.webview
      .asWebviewUri(
        vscode.Uri.file(
          path.join(
            context.extensionPath,
            isDev ? "src" : "dist",
            "canvas",
            file
          )
        )
      )
      .toString();

  const replacements = [
    // Styles
    "./styles.css",

    //Scripts
    "./utils.js",
    "./canvas.js",
    "./undoRedo.js",
    "./canvasEvents.js",
    "./canvasActions.js",
    "./selection.js",
  ];

  for (const replacement of replacements) {
    html = html.replace(replacement, webviewUri(replacement));
  }

  return html;
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("freedraw.startDrawing", () => {
      const panel = vscode.window.createWebviewPanel(
        "canvas",
        "Free Draw",
        vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true }
      );

      panel.webview.html = getWebviewContent(context, panel);

      // Restore the canvas content from the global state
      const savedCanvas = context.globalState.get<string>("savedCanvas");
      if (savedCanvas) {
        panel.webview.postMessage({
          command: "restoreCanvas",
          data: savedCanvas,
        });
      }

      // Save the canvas content before the webview is disposed
      panel.onDidDispose(() => {
        panel.webview.postMessage({ command: "saveCanvas" });
      });

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage((message) => {
        switch (message.command) {
          case "saveCanvas":
            context.globalState.update("savedCanvas", message.data);
            break;
        }
      });
    })
  );
}

export function deactivate() {}
