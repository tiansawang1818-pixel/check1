import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
self.MonacoEnvironment = {
  getWorker: (_id, label) =>
    label === "json" ? new JsonWorker() : new EditorWorker(),
};
loader.config({ monaco });
export default function AdvancedEditor(
  { value, onChange }: { value: string; onChange: (value: string) => void },
) {
  return (
    <Editor
      height="420px"
      language="json"
      value={value}
      onChange={(value) => onChange(value || "")}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
      }}
    />
  );
}
