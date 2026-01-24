// Универсальная обёртка модуля (UMD) для подключения к CodeMirror
(function (mod) {
    if (typeof exports == "object" && typeof module == "object")
        mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd)
        define(["../../lib/codemirror"], mod);
    else
        mod(CodeMirror);
    })(function (CodeMirror) {
      "use strict";

  CodeMirror.defineMode("nfqws", function (_config, parserConfig) {
  parserConfig = parserConfig || {};
  const noNumbers = !!parserConfig.noNumbers; // # Флаг: отключить подсветку чисел (актуально для .list)
  const noOperators = !!parserConfig.noOperators; // # Флаг: отключить подсветку операторов (= , :) (актуально для .list)

    // # regex для переменных (и обычных, и спец. $1 $@ $? ...)
    const reVarBraced = /^\$\{[A-Za-z_][A-Za-z0-9_-]*\}/;
    const reVarSpecial = /^\$(?:[0-9]+|[$#?@*!-])/;
    const reVarPlain = /^\$[A-Za-z_][A-Za-z0-9_-]*/;
    const reNewInString = /^--new\b/;
    const reOp = /^[=,:]/; // операторы которые будут подсвечиваться

    function tokenBase(stream, state) {
      // # Если сейчас внутри строки — подсвечивать переменные внутри строки
      if (state.inString) {
        // переменные внутри строки
        if (stream.match(reVarBraced) || stream.match(reVarSpecial) || stream.match(reVarPlain)) {
          return "variable-2";
        }
        // # --new внутри строки (кавычек)
        if (stream.match(reNewInString)) {
          return "keyword"; // будет краситься как обычные --опции (cm-keyword)
        }

        // обработка экранирования
        if (state.escaped) {
          stream.next();
          state.escaped = false;
          return "string";
        }

        const ch = stream.next();
        if (ch === "\\") {
          state.escaped = true;
          return "string";
        }

        // конец строки
        if (ch === state.quote) {
          state.inString = false;
          state.quote = null;
          state.escaped = false;
          return "string";
        }

        // обычный текст строки — бежим до следующего $, \, кавычки ИЛИ '-' (чтобы поймать --new)
        stream.eatWhile(function (c) {
        return c !== "$" && c !== "\\" && c !== state.quote && c !== "-";
        });
        return "string";

      }

      // # comment
      if (stream.peek() === "#") {
        stream.skipToEnd();
        return "comment";
      }

      // # strings start
      const q = stream.peek();
      if (q === '"' || q === "'") {
        state.inString = true;
        state.quote = q;
        state.escaped = false;
        stream.next(); 
        return "string";
      }
      // # variables (вне строки)
      if (stream.match(reVarBraced) || stream.match(reVarSpecial) || stream.match(reVarPlain)) {
        return "variable-2";
      }

      // # numbers (только число). Диапазон 123:456 будет number ':' number
      if (!noNumbers && stream.match(/^\d+/)) return "number";

      // # long options like --dpi-desync-fake-tls
      if (stream.match(/^--[A-Za-z0-9][A-Za-z0-9-]*/)) return "keyword";

      // # красим только VAR, а '=' пойдёт отдельным operator
      const m = stream.match(/^[A-Za-z_][A-Za-z0-9_]*/, false);
      if (m && stream.string.charAt(stream.pos + m[0].length) === '=') {
        stream.match(/^[A-Za-z_][A-Za-z0-9_]*/);
        return "def";
      }

      // операторы вне строки: = , :
      if (!noOperators && stream.match(reOp)) return "operator";

      // # сдвиг на 1 символ
      stream.next();
      return null;
    }

    return {
      startState() {
        return { inString: false, quote: null, escaped: false };
      },
      token: tokenBase,
      lineComment: "#"
    };
  });
});
