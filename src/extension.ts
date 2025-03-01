import * as vscode from "vscode";

export function getFormattedText(document: vscode.TextDocument): string {
  // Konfiguration auslesen
  const config = vscode.workspace.getConfiguration("reqFormatter");
  const removeDuplicates = config.get<boolean>("removeDuplicates", false);

  // Alle Zeilen einlesen; leere Zeilen ignorieren
  let lines: string[] = [];
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text;
    if (line.trim() !== "") {
      lines.push(line);
    }
  }

  // Zunächst alphabetisch sortieren
  lines.sort((a, b) => a.localeCompare(b));

  if (removeDuplicates) {
    // Map zur deduplizierung: Schlüssel = Paketname (alles vor '=' oder die ganze Zeile)
    const deduped = new Map<string, string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "") continue;

      // Paketname extrahieren: Falls '=' enthalten ist, nehmen wir den Teil davor,
      // ansonsten die gesamte Zeile.
      const pkgName = trimmed.includes("=")
        ? trimmed.split("=")[0].trim()
        : trimmed;
      const hasVersion = trimmed.includes("=");
      const existing = deduped.get(pkgName);

      if (!existing) {
        deduped.set(pkgName, trimmed);
      } else {
        // Bevorzugt wird der Eintrag mit Versionsangabe:
        // 1. Falls der vorhandene Eintrag KEIN '=' enthält, aber der neue schon, ersetzen.
        if (!existing.includes("=") && hasVersion) {
          deduped.set(pkgName, trimmed);
        }
        // 2. Liegen bei beiden Versionseinträgen Versionen vor, wählen wir den lexikografisch
        // "größeren" Eintrag (z. B. wird "python=3.5" gegenüber "python=3.4" bevorzugt).
        else if (hasVersion && existing.includes("=")) {
          if (trimmed.localeCompare(existing) > 0) {
            deduped.set(pkgName, trimmed);
          }
        }
        // Sonst: den vorhandenen Eintrag beibehalten.
      }
    }

    // Deduplizierte Zeilen neu in ein Array übernehmen und abschließend sortieren
    lines = Array.from(deduped.values());
    lines.sort((a, b) => a.localeCompare(b));
  }

  return lines.join("\n");
}

export function activate(context: vscode.ExtensionContext) {
  // 1. Registriere den manuellen Command "Sort Requirements"
  const sortCommand = vscode.commands.registerCommand(
    "extension.sortRequirements",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const document = editor.document;
      const newText = getFormattedText(document);
      const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(document.lineCount, 0)
      );
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, fullRange, newText);
      await vscode.workspace.applyEdit(edit);
    }
  );
  context.subscriptions.push(sortCommand);

  // 2. Registriere den DocumentFormattingEditProvider für requirements.txt
  const formattingProvider =
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: "file", pattern: "**/requirements.txt" },
      {
        provideDocumentFormattingEdits(
          document: vscode.TextDocument
        ): vscode.TextEdit[] {
          const fullRange = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(document.lineCount, 0)
          );
          return [
            vscode.TextEdit.replace(fullRange, getFormattedText(document))
          ];
        }
      }
    );
  context.subscriptions.push(formattingProvider);
}

export function deactivate() {}
