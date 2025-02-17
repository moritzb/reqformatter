import * as assert from "assert";
import * as vscode from "vscode";
import { getFormattedText } from "../extension";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Sort and remove duplicates in requirements.txt", () => {
    const mockDocument = {
      lineCount: 10,
      lineAt: (i: number) => {
        const lines = [
          "requests==2.25.1",
          "requests==2.26.0",
          "numpy==1.19.5",
          "numpy",
          "pandas==1.2.3",
          "pandas",
          "flask==2.0.1",
          "Django==3.2",
          "beautifulsoup4",
          "beautifulsoup4==4.9.3"
        ];
        return { text: lines[i] };
      }
    } as vscode.TextDocument;

    const expectedOutput = [
      "beautifulsoup4==4.9.3",
      "Django==3.2",
      "flask==2.0.1",
      "numpy==1.19.5",
      "pandas==1.2.3",
      "requests==2.26.0"
    ].join("\n");

    const formattedText = getFormattedText(mockDocument);
    assert.strictEqual(formattedText, expectedOutput);
  });
});
