"""The two custom backends built step by step in Notebook 5, packaged for reuse in Notebook 6."""

import fnmatch
import re
import sqlite3
import threading
from datetime import datetime, timezone

from deepagents.backends.protocol import (
    BackendProtocol, DeleteResult, EditResult, FileInfo, GlobResult, GrepMatch, GrepResult,
    LsResult, ReadResult, WriteResult,
)
from deepagents.backends.utils import slice_read_response


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _glob_match(rel_path: str, pattern: str) -> bool:
    """Match like the built in backends: '**/' is optional and a bare pattern matches the file name at any depth."""
    name = rel_path.rsplit("/", 1)[-1]
    return (fnmatch.fnmatch(rel_path, pattern)
            or fnmatch.fnmatch(rel_path, pattern.removeprefix("**/"))
            or ("/" not in pattern and fnmatch.fnmatch(name, pattern)))


class SQLiteBackend(BackendProtocol):
    """A filesystem whose files are rows in a SQLite table: files(path, content, created_at, modified_at)."""

    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        # The agent may run several tool calls in parallel threads; one shared connection needs a lock.
        self._lock = threading.RLock()
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, content TEXT, created_at TEXT, modified_at TEXT)"
        )
        self.conn.commit()

    # helpers
    def _rows(self, prefix: str = "/"):
        prefix = prefix if prefix.endswith("/") else prefix + "/"
        with self._lock:
            return self.conn.execute(
                "SELECT path, content, modified_at FROM files WHERE path LIKE ? ORDER BY path", (prefix + "%",)
            ).fetchall()

    def _get(self, path: str):
        with self._lock:
            return self.conn.execute("SELECT content, created_at, modified_at FROM files WHERE path = ?", (path,)).fetchone()

    # protocol methods
    def ls(self, path: str) -> LsResult:
        base = path if path.endswith("/") else path + "/"
        entries: dict[str, FileInfo] = {}
        for full, content, modified in self._rows(base):
            rest = full[len(base):]
            if "/" in rest:                                   # inside a sub folder: show the folder once
                folder = base + rest.split("/")[0] + "/"
                entries[folder] = FileInfo(path=folder, is_dir=True)
            else:
                entries[full] = FileInfo(path=full, is_dir=False, size=len(content), modified_at=modified)
        return LsResult(entries=sorted(entries.values(), key=lambda e: e["path"]))

    def read(self, file_path: str, offset: int = 0, limit: int = 2000) -> ReadResult:
        row = self._get(file_path)
        if row is None:
            return ReadResult(error=f"File '{file_path}' not found")
        content, created, modified = row
        file_data = {"content": content, "encoding": "utf-8", "created_at": created, "modified_at": modified}
        return slice_read_response(file_data, offset, limit)  # library helper: line pagination done right

    def write(self, file_path: str, content: str) -> WriteResult:
        with self._lock:
            existing = self._get(file_path)
            created = existing[1] if existing else _now()
            self.conn.execute("INSERT OR REPLACE INTO files VALUES (?, ?, ?, ?)", (file_path, content, created, _now()))
            self.conn.commit()
        return WriteResult(path=file_path)

    def edit(self, file_path: str, old_string: str, new_string: str, replace_all: bool = False) -> EditResult:
        row = self._get(file_path)
        if row is None:
            return EditResult(error=f"File '{file_path}' not found")
        content = row[0]
        count = content.count(old_string)
        if count == 0:
            return EditResult(error=f"String not found in '{file_path}'")
        if count > 1 and not replace_all:
            return EditResult(error=f"String appears {count} times. Provide more context or set replace_all=True")
        new_content = content.replace(old_string, new_string) if replace_all else content.replace(old_string, new_string, 1)
        self.write(file_path, new_content)
        return EditResult(path=file_path, occurrences=count if replace_all else 1)

    def grep(self, pattern: str, path: str | None = None, glob: str | None = None, **kwargs) -> GrepResult:
        matches: list[GrepMatch] = []
        base = path or "/"
        base = base if base.endswith("/") else base + "/"
        for full, content, _ in self._rows(base):
            if glob and not _glob_match(full[len(base):], glob):
                continue
            for i, line in enumerate(content.splitlines(), start=1):
                if pattern.lower() in line.lower():           # literal text search, ignoring upper/lower case
                    matches.append(GrepMatch(path=full, line=i, text=line))
        return GrepResult(matches=matches)

    def glob(self, pattern: str, path: str | None = None) -> GlobResult:
        base = path or "/"
        base = base if base.endswith("/") else base + "/"
        found = []
        for full, content, modified in self._rows(base):
            if _glob_match(full[len(base):], pattern):
                found.append(FileInfo(path=full, is_dir=False, size=len(content), modified_at=modified))
        return GlobResult(matches=found)

    def delete(self, file_path: str) -> DeleteResult:
        with self._lock:
            cur = self.conn.execute("DELETE FROM files WHERE path = ? OR path LIKE ?", (file_path, file_path.rstrip("/") + "/%"))
            self.conn.commit()
        if cur.rowcount == 0:
            return DeleteResult(error=f"'{file_path}' not found")
        return DeleteResult(path=file_path)


class AuditedPolicyBackend(BackendProtocol):
    SECRET_PATTERNS = [re.compile(r"sk-[A-Za-z0-9]{16,}"), re.compile(r"AKIA[0-9A-Z]{16}"), re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")]

    def __init__(self, inner: BackendProtocol, deny_prefixes=None, max_writes: int = 20):
        self.inner = inner
        self.deny_prefixes = [p if p.endswith("/") else p + "/" for p in (deny_prefixes or [])]
        self.max_writes = max_writes
        self.writes = 0
        self.audit_log: list[dict] = []

    def _log(self, op, path, outcome):
        self.audit_log.append({"time": _now()[11:19], "op": op, "path": path, "outcome": outcome})

    def _check_write(self, path: str, content: str) -> str | None:
        if any(path.startswith(p) for p in self.deny_prefixes):
            return f"Writes are not allowed under {path}"
        if any(p.search(content) for p in self.SECRET_PATTERNS):
            return "Blocked: content looks like a secret or credential. Never store secrets in files."
        if self.writes >= self.max_writes:
            return f"Rate limit: max {self.max_writes} writes per session reached"
        return None

    # reads pass through, but are audited
    def ls(self, path):
        self._log("ls", path, "ok"); return self.inner.ls(path)

    def read(self, file_path, offset=0, limit=2000):
        res = self.inner.read(file_path, offset=offset, limit=limit)
        self._log("read", file_path, res.error or "ok"); return res

    def grep(self, pattern, path=None, glob=None, **kwargs):
        self._log("grep", path or "/", f"pattern={pattern!r}"); return self.inner.grep(pattern, path, glob)

    def glob(self, pattern, path=None):
        self._log("glob", path or "/", f"pattern={pattern!r}"); return self.inner.glob(pattern, path)

    # writes are checked
    def write(self, file_path, content):
        if err := self._check_write(file_path, content):
            self._log("write", file_path, "DENIED: " + err); return WriteResult(error=err)
        self.writes += 1
        self._log("write", file_path, "ok"); return self.inner.write(file_path, content)

    def edit(self, file_path, old_string, new_string, replace_all=False):
        if err := self._check_write(file_path, new_string):
            self._log("edit", file_path, "DENIED: " + err); return EditResult(error=err)
        self.writes += 1
        self._log("edit", file_path, "ok"); return self.inner.edit(file_path, old_string, new_string, replace_all)
    # no delete(): the wrapper does not implement it, so the delete tool is hidden from the model
