#!/usr/bin/env bash
# PostToolUse (Write|Edit): en archivos de código elimina las líneas en blanco,
# aplica ESLint --fix y formatea con Prettier. Los Markdown solo pasan por
# Prettier (necesitan líneas en blanco). Los errores que ESLint no puede
# corregir se devuelven a Claude (exit 2) para que los arregle.

file=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -z "$file" ] || [ ! -f "$file" ] && exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0

case "$file" in
  *.tsx|*.jsx|*.ts|*.js|*.mjs)
    sed -i '/^[[:space:]]*$/d' "$file"
    out=$(npx --no-install eslint --fix "$file" 2>&1)
    status=$?
    npx --no-install prettier --write --log-level warn "$file" >&2
    if [ $status -ne 0 ]; then
      echo "ESLint encontró problemas en $file:" >&2
      echo "$out" >&2
      exit 2
    fi
    ;;
  *.md)
    npx --no-install prettier --write --log-level warn "$file" >&2
    ;;
esac
exit 0
