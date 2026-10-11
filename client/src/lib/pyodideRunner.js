let pyodidePromise = null;

export async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      if (!window.loadPyodide) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Не удалось загрузить Python runtime'));
          document.head.appendChild(script);
        });
      }
      return window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/',
      });
    })();
  }
  return pyodidePromise;
}

function normalizeOut(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trimEnd();
}

/** Запуск Python-кода с подставленным stdin (песочница Pyodide в браузере). */
export async function runPython(code, stdin = '') {
  const pyodide = await getPyodide();
  const payload = JSON.stringify({
    code: String(code ?? ''),
    stdin: String(stdin ?? ''),
  });

  const script = `
import sys, json
from io import StringIO
_payload = json.loads(${JSON.stringify(payload)})
_stdin = StringIO(_payload["stdin"])
_stdout = StringIO()
_stderr = StringIO()
_old = sys.stdin, sys.stdout, sys.stderr
sys.stdin, sys.stdout, sys.stderr = _stdin, _stdout, _stderr
_ok = True
try:
    exec(compile(_payload["code"], "<solution.py>", "exec"), {"__name__": "__main__"})
except Exception as e:
    _ok = False
    _stderr.write(f"{type(e).__name__}: {e}")
finally:
    sys.stdin, sys.stdout, sys.stderr = _old
json.dumps({"stdout": _stdout.getvalue(), "stderr": _stderr.getvalue(), "ok": _ok})
`;

  try {
    const raw = await pyodide.runPythonAsync(script);
    const parsed = JSON.parse(raw);
    return {
      stdout: parsed.stdout || '',
      stderr: parsed.stderr || '',
      ok: Boolean(parsed.ok),
    };
  } catch (err) {
    return {
      stdout: '',
      stderr: err.message || String(err),
      ok: false,
    };
  }
}

/** Прогон кода по входам без сравнения (для отправки на сервер). */
export async function runAgainstInputs(code, testCases = []) {
  const runs = [];
  for (let i = 0; i < testCases.length; i += 1) {
    const tc = testCases[i];
    const started = performance.now();
    const run = await runPython(code, tc.input ?? '');
    runs.push({
      index: i + 1,
      stdout: run.stdout || '',
      stderr: run.stderr || '',
      ok: Boolean(run.ok),
      ms: Math.round(performance.now() - started),
    });
  }
  return runs;
}

export async function runTests(code, testCases = [], { samplesOnly = false } = {}) {
  let cases = Array.isArray(testCases) ? testCases : [];
  if (samplesOnly) {
    const samples = cases.filter((tc) => tc.isSample);
    cases = samples.length ? samples : cases.slice(0, 1);
  }

  if (!cases.length) {
    const single = await runPython(code, '');
    return {
      ok: single.ok,
      status: single.ok ? 'OK' : 'ERROR',
      output: single.ok
        ? `stdout:\n${single.stdout || '(пусто)'}\nexit code: 0`
        : `Ошибка:\n${single.stderr}`,
      results: [],
    };
  }

  const results = [];
  for (let i = 0; i < cases.length; i += 1) {
    const tc = cases[i];
    const started = performance.now();
    const run = await runPython(code, tc.input);
    const ms = Math.round(performance.now() - started);
    const actual = normalizeOut(run.stdout);
    const expected = normalizeOut(tc.expectedOutput);
    const passed = run.ok && actual === expected;
    results.push({
      index: i + 1,
      input: tc.input,
      expected,
      actual,
      passed,
      error: run.ok ? null : run.stderr,
      ms,
      isSample: Boolean(tc.isSample),
    });
  }

  const ok = results.every((r) => r.passed);
  const output = results
    .map((r) => {
      if (r.error) {
        return `Тест #${r.index}: ERROR (${r.ms} ms)\n${r.error}`;
      }
      return (
        `Тест #${r.index}: ${r.passed ? 'OK' : 'FAIL'} (${r.ms} ms)\n` +
        `input:\n${r.input}\n` +
        `expected:\n${r.expected}\n` +
        `got:\n${r.actual || '(пусто)'}`
      );
    })
    .join('\n\n');

  return {
    ok,
    status: ok ? 'Accepted' : 'Wrong answer',
    output,
    results,
  };
}

export async function runSampleTests(code, testCases = []) {
  return runTests(code, testCases, { samplesOnly: true });
}

/** Прогнать эталон и заполнить expectedOutput по stdout. */
export async function fillOutputsFromReference(referenceCode, testCases = []) {
  const next = [];
  for (const tc of testCases) {
    const run = await runPython(referenceCode, tc.input);
    if (!run.ok) {
      next.push({
        ...tc,
        expectedOutput: tc.expectedOutput,
        _error: run.stderr || 'Ошибка эталона',
      });
    } else {
      next.push({
        ...tc,
        expectedOutput: normalizeOut(run.stdout),
        _error: null,
      });
    }
  }
  return next;
}
