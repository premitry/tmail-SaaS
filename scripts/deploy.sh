#!/usr/bin/env bash
# Deploy ke VPS: push -> fetch+reset (WAJIB fetch biar tak pakai ref basi) -> restart.
set -euo pipefail
cd "$(dirname "$0")/.."
export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/tmail_vps -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes"
git push -q vps master
python scripts/vps.py "cd /root/tmail-saas && git fetch -q origin && git reset --hard -q origin/master && systemctl restart tmail && sleep 6 && systemctl is-active tmail && git log -1 --oneline"
