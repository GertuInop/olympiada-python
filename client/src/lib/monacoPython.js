let registered = false;

const KEYWORDS = [
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
  'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
];

const BUILTINS = [
  { label: 'print', detail: 'вывод в консоль', insert: 'print(${1:value})' },
  { label: 'input', detail: 'чтение строки', insert: 'input(${1:""})' },
  { label: 'int', detail: 'целое число', insert: 'int(${1:x})' },
  { label: 'float', detail: 'вещественное', insert: 'float(${1:x})' },
  { label: 'str', detail: 'строка', insert: 'str(${1:x})' },
  { label: 'len', detail: 'длина', insert: 'len(${1:x})' },
  { label: 'range', detail: 'диапазон', insert: 'range(${1:n})' },
  { label: 'list', detail: 'список', insert: 'list(${1:x})' },
  { label: 'map', detail: 'применить функцию', insert: 'map(${1:fn}, ${2:iterable})' },
  { label: 'sum', detail: 'сумма', insert: 'sum(${1:iterable})' },
  { label: 'min', detail: 'минимум', insert: 'min(${1:iterable})' },
  { label: 'max', detail: 'максимум', insert: 'max(${1:iterable})' },
  { label: 'sorted', detail: 'сортировка', insert: 'sorted(${1:iterable})' },
  { label: 'enumerate', detail: 'индекс + значение', insert: 'enumerate(${1:iterable})' },
  { label: 'zip', detail: 'объединить последовательности', insert: 'zip(${1:a}, ${2:b})' },
  { label: 'abs', detail: 'модуль числа', insert: 'abs(${1:x})' },
  { label: 'round', detail: 'округление', insert: 'round(${1:x}, ${2:0})' },
  { label: 'open', detail: 'открыть файл', insert: "open(${1:'file.txt'}, ${2:'r'})" },
];

export const PYTHON_SNIPPETS = [
  {
    id: 'read-ints',
    label: 'Считать числа',
    detail: 'n = int(input()) / список чисел',
    insert: 'n = int(input())\na = list(map(int, input().split()))\n',
  },
  {
    id: 'read-two',
    label: 'Два числа',
    detail: 'a, b = map(int, input().split())',
    insert: 'a, b = map(int, input().split())\n',
  },
  {
    id: 'for-range',
    label: 'Цикл for',
    detail: 'for i in range(n):',
    insert: 'for i in range(${1:n}):\n    ${2:pass}\n',
  },
  {
    id: 'solve-fn',
    label: 'Шаблон solve()',
    detail: 'функция решения + main',
    insert:
      'def solve():\n    ${1:pass}\n\n\nif __name__ == "__main__":\n    solve()\n',
  },
  {
    id: 'if-else',
    label: 'if / else',
    detail: 'ветвление',
    insert: 'if ${1:condition}:\n    ${2:pass}\nelse:\n    ${3:pass}\n',
  },
  {
    id: 'list-comp',
    label: 'List comprehension',
    detail: '[x for x in ...]',
    insert: '${1:result} = [${2:x} for ${2:x} in ${3:iterable}]\n',
  },
];

/**
 * Регистрирует автодополнение, сниппеты и hover-подсказки для Python в Monaco.
 */
export function registerPythonLanguage(monaco) {
  if (registered) return;
  registered = true;

  monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.', '_'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const keywordItems = KEYWORDS.map((k) => ({
        label: k,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: k,
        range,
        detail: 'keyword',
      }));

      const builtinItems = BUILTINS.map((b) => ({
        label: b.label,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: b.insert,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        detail: b.detail,
        documentation: `Встроенная функция Python: ${b.label}`,
      }));

      const snippetItems = PYTHON_SNIPPETS.map((s) => ({
        label: s.label,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: s.insert,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        detail: s.detail,
        documentation: 'Шаблон OLIMP',
      }));

      return { suggestions: [...snippetItems, ...builtinItems, ...keywordItems] };
    },
  });

  monaco.languages.registerHoverProvider('python', {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const builtin = BUILTINS.find((b) => b.label === word.word);
      if (builtin) {
        return {
          contents: [
            { value: `**${builtin.label}**` },
            { value: builtin.detail },
            { value: '```python\n' + builtin.insert.replace(/\$\{\d+:?([^}]*)\}/g, '$1') + '\n```' },
          ],
        };
      }
      if (KEYWORDS.includes(word.word)) {
        return {
          contents: [{ value: `**${word.word}** — ключевое слово Python` }],
        };
      }
      return null;
    },
  });
}

export function getPythonEditorOptions() {
  return {
    fontSize: 14,
    fontFamily: 'JetBrains Mono, monospace',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4,
    renderWhitespace: 'selection',
    padding: { top: 12 },
    suggestOnTriggerCharacters: true,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },
    suggest: {
      showWords: true,
      showSnippets: true,
      preview: true,
      insertMode: 'replace',
    },
    parameterHints: { enabled: true },
    wordBasedSuggestions: 'matchingDocuments',
    snippetSuggestions: 'top',
    tabCompletion: 'on',
    acceptSuggestionOnEnter: 'on',
  };
}

export function insertSnippet(editor, monaco, insertText) {
  if (!editor || !monaco) return;
  editor.focus();
  // SnippetController поддерживает плейсхолдеры ${1:…}
  const contribution = editor.getContribution('snippetController2');
  if (contribution && typeof contribution.insert === 'function') {
    contribution.insert(insertText);
    return;
  }
  const selection = editor.getSelection();
  if (!selection) return;
  const plain = insertText.replace(/\$\{\d+:?([^}]*)\}/g, '$1').replace(/\$\d+/g, '');
  editor.executeEdits('olimp-snippet', [
    {
      range: selection,
      text: plain,
      forceMoveMarkers: true,
    },
  ]);
}
