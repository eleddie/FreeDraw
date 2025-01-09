import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import Color from "color";

function getWebviewContent(
  context: vscode.ExtensionContext,
  isDark: boolean,
  foregroundColor: string,
  backgroundColor: string
) {
  const filePath: vscode.Uri = vscode.Uri.file(
    path.join(context.extensionPath, "src", "html", "canvas.html")
  );
  let html = fs.readFileSync(filePath.fsPath, "utf8");
  const colorMap = {
    "#fffffe": foregroundColor,
    "#000001": backgroundColor,
    "#333333": isDark ? "#333333" : Color(backgroundColor).darken(0.3).hex(),
    "#444444": isDark ? "#444444" : Color(backgroundColor).darken(0.2).hex(),
  };
  for (const [key, value] of Object.entries(colorMap)) {
    html = html.replaceAll(key, value);
  }
  console.log(html);
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

      const themeKind = vscode.window.activeColorTheme.kind;

      const isDark = [
        vscode.ColorThemeKind.Dark,
        vscode.ColorThemeKind.HighContrast,
      ].includes(themeKind);
      const foregroundColor = isDark ? "#ffffff" : "#000000";
      const backgroundColor = isDark ? "#000000" : "#ffffff";

      panel.webview.html = getWebviewContent(
        context,
        isDark,
        foregroundColor,
        backgroundColor
      );

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
