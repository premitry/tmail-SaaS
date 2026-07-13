#!/usr/bin/env python
# Helper SSH ke VPS: coba key dulu, fallback password (env VPS_PASS). Jalankan perintah dari argv.
import os, sys, paramiko
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

HOST = os.environ.get("VPS_HOST", "146.190.105.253")
USER = os.environ.get("VPS_USER", "root")
KEY  = os.path.expanduser("~/.ssh/tmail_vps")
PASS = os.environ.get("VPS_PASS", "")

def client():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        c.connect(HOST, username=USER, key_filename=KEY, timeout=20, look_for_keys=False, allow_agent=False)
        return c, "key"
    except Exception:
        c.connect(HOST, username=USER, password=PASS, timeout=20, look_for_keys=False, allow_agent=False)
        return c, "password"

def run(c, cmd, get_pty=False):
    stdin, stdout, stderr = c.exec_command(cmd, get_pty=get_pty, timeout=600)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    rc = stdout.channel.recv_exit_status()
    return rc, out, err

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "echo ok"
    c, how = client()
    sys.stderr.write(f"[connected via {how}]\n")
    rc, out, err = run(c, cmd)
    sys.stdout.write(out)
    if err.strip():
        sys.stderr.write("[stderr] " + err)
    c.close()
    sys.exit(rc)

if __name__ == "__main__":
    main()
