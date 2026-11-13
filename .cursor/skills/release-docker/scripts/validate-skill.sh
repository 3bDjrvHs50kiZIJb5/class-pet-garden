#!/usr/bin/env bash
# 本地扫描 release-docker skill 是否可被 Cursor 发现
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
SKILL_DIR="$ROOT/.cursor/skills/release-docker"
SKILL_FILE="$SKILL_DIR/SKILL.md"

echo "仓库根目录: $ROOT"
echo "---"
if [[ ! -f "$SKILL_FILE" ]]; then
  echo "FAIL: 缺少 $SKILL_FILE"
  exit 1
fi
echo "OK: 找到 SKILL.md"

name="$(sed -n '/^---$/,/^---$/p' "$SKILL_FILE" | grep '^name:' | sed 's/^name: *//')"
dir="$(basename "$SKILL_DIR")"
if [[ "$name" != "$dir" ]]; then
  echo "FAIL: frontmatter name=$name 与目录名 $dir 不一致"
  exit 1
fi
echo "OK: name=$name 与目录一致"

if ! grep -q '^description:' "$SKILL_FILE"; then
  echo "FAIL: 缺少 description"
  exit 1
fi
echo "OK: description 存在"

echo "---"
echo "Cursor 应显示斜杠命令: /$name"
echo "Customize → Skills 或输入 / 后搜索 release"
