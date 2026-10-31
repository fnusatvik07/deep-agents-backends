"""Small helpers shared by every notebook in the Deep Agents Backends class.

They only exist to make agent runs easy to read on a projector:
which tools the agent called, what each tool returned, and what the final answer was.
"""

import json
import re
import os
import shutil
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

# One place to change the model for the whole class.
# gpt-5.4-mini is fast and cheap for live demos; switch to "openai:gpt-5.5" for harder tasks.
MODEL = os.getenv("COURSE_MODEL", "openai:gpt-5.4-mini")


def clean(text: str) -> str:
    """Normalize long dashes in model output to a plain hyphen for slide friendly display."""
    return text.replace("\u2014", "-").replace("\u2013", "-")


def final_text(result) -> str:
    """Return the agent's last message as plain text."""
    content = result["messages"][-1].content
    if not isinstance(content, str):
        content = "".join(block.get("text", "") for block in content if isinstance(block, dict))
    return clean(content)


def peek(text: str, limit: int = 800) -> None:
    """Print the start of a long text (file content, tool output) for inspection."""
    print(clean(text[:limit]) + (" ..." if len(text) > limit else ""))


def _short(value, limit=160) -> str:
    text = value if isinstance(value, str) else json.dumps(value, default=str, ensure_ascii=False)
    text = clean(text).replace("\n", " \\n ")
    return text if len(text) <= limit else text[:limit] + " ..."


# tool name -> (what it did, what it tried to do, which argument names the target)
_ACTIONS = {
    "ls": ("LOOKED INSIDE the folder", "look inside the folder", "path"),
    "read_file": ("OPENED and read the file", "open the file", "file_path"),
    "write_file": ("CREATED (or replaced) the file", "create the file", "file_path"),
    "edit_file": ("CHANGED part of the file", "change the file", "file_path"),
    "delete": ("DELETED", "delete", "file_path"),
    "glob": ("SEARCHED for files named", "search for files named", "pattern"),
    "grep": ("SEARCHED inside files for the text", "search inside files for", "pattern"),
    "execute": ("RAN this terminal command:", "run the terminal command", "command"),
    "task": ("ASKED a helper agent to", "ask a helper agent to", "description"),
    "write_todos": ("WROTE itself a to-do list", "write a to-do list", None),
}


def _plain(text: str, limit: int) -> str:
    """Make a tool answer readable: drop technical markers and show line breaks as ' / '."""
    text = clean(text if isinstance(text, str) else json.dumps(text, default=str, ensure_ascii=False))
    text = re.sub(r"@@ lines (\d+)-(\d+) of (\d+) @@\s*", r"(lines \1 to \2 of \3) ", text)
    text = text.replace("[stderr] ", "").replace("[stderr]", "")
    text = " / ".join(part.strip() for part in text.splitlines() if part.strip() and set(part.strip()) != {"-"})
    return text if len(text) <= limit else text[:limit] + " ..."


def _was_refused(answer_text: str) -> bool:
    lowered = answer_text.lower()
    return lowered.startswith(("user rejected", "error", "blocked")) or "permission denied" in lowered


def show_trace(result, limit=160) -> None:
    """Explain, in plain English, every action the agent took in the latest turn and what it got back."""
    messages = result["messages"]
    last_human = max((i for i, m in enumerate(messages) if m.type == "human"), default=0)
    answers = {m.tool_call_id: m for m in messages[last_human:] if m.type == "tool"}
    print("WHAT THE AGENT DID, STEP BY STEP")
    print("=" * 78)
    step = 0
    for msg in messages[last_human:]:
        if msg.type != "ai":
            continue
        for call in getattr(msg, "tool_calls", []) or []:
            step += 1
            done, tried, key = _ACTIONS.get(call["name"], (f"USED its tool '{call['name']}'", f"use its tool '{call['name']}'", None))
            target = str(call["args"].get(key, "")) if key else ""
            answer = answers.get(call["id"])
            answer_text = answer.content if answer is not None and isinstance(answer.content, str) else ""
            if answer is not None and "not found" in answer_text.lower() and call["name"] in ("read_file", "edit_file", "ls"):
                print(f"Step {step}. The agent tried to {tried} {_short(target, 100)}")
                print("         Nothing exists under that name yet, so there was nothing to read.")
                continue
            if answer is not None and _was_refused(answer_text):
                print(f"Step {step}. The agent TRIED to {tried} {_short(target, 100)}")
                print(f"         NOT DONE. Reason: {_plain(answer_text, limit)}")
                continue
            print(f"Step {step}. The agent {done} {_short(target, 100)}".rstrip())
            if answer is None:
                continue
            if answer_text.startswith("Tool result too large"):
                saved = re.search(r"at this path: (\S+)", answer_text)
                where = saved.group(1) if saved else "a file"
                print(f"         The answer was too big to read at once, so it was saved to the file {where}")
            else:
                print(f"         It got back: {_plain(answer.content, limit)}")
    if step == 0:
        print("The agent answered directly, without using any tool.")
    print("=" * 78)
    print("THE AGENT'S REPLY TO YOU:")
    print(final_text(result))
    if step:
        print()
        print("Note: file names in the steps above (starting with /) are the AGENT'S names for files,")
        print("not places on your Mac. See 'WHERE DID THE FILES GO?' for where they really are.")


# Viewable copies of in-memory agent files are written here, one folder per demo.
SNAPSHOT_ROOT = Path(__file__).resolve().parent / "agent_files"


def _content(data: dict) -> str:
    content = data.get("content", "")
    return "\n".join(content) if isinstance(content, list) else content


def _snapshot(folder: Path, virtual_path: str, content: str) -> Path:
    real = folder / virtual_path.lstrip("/")
    real.parent.mkdir(parents=True, exist_ok=True)
    real.write_text(content)
    return real


def _fresh_folder(save_as: str) -> Path:
    folder = SNAPSHOT_ROOT / save_as
    shutil.rmtree(folder, ignore_errors=True)
    folder.mkdir(parents=True)
    return folder


def show_state_files(result, save_as: str | None = None) -> None:
    """List the files that live inside LangGraph state (the StateBackend storage).

    These files exist only in memory. Pass save_as="some-name" to also write a viewable
    snapshot under notebooks/agent_files/some-name/ and print clickable real paths.
    """
    files = result.get("files", {}) or {}
    if not files:
        print("No files in agent state.")
        return
    folder = _fresh_folder(save_as) if save_as else None
    print(f"{len(files)} file(s) in agent state (in memory, not on disk):")
    for path, data in files.items():
        content = _content(data)
        print(f"  {path}  ({len(content)} chars)")
        if folder:
            print(f"      snapshot to open: {_snapshot(folder, path, content)}")


def show_store(store, namespace_prefix=(), save_as: str | None = None) -> None:
    """List every file kept in a LangGraph store, drawer by drawer (a drawer = a namespace).

    Pass save_as="some-name" to also write a copy of each file under notebooks/agent_files/some-name/
    so you can open it.
    """
    items = store.search(namespace_prefix, limit=1000)
    if not items:
        print("The store is empty.")
        return
    folder = _fresh_folder(save_as) if save_as else None
    print(f"The store holds {len(items)} file(s):")
    for item in items:
        content = _content(item.value)
        print(f"  drawer {item.namespace}  file {item.key}")
        print(f"      content: {_short(content, 90)}")
        if folder:
            print(f"      copy you can open: {_snapshot(folder / '__'.join(item.namespace), item.key, content)}")


def real_path(root_dir, virtual_path: str) -> Path:
    """Translate a FilesystemBackend virtual path (e.g. /REVIEW.md) to the real file on disk."""
    return Path(root_dir) / virtual_path.lstrip("/")


def tree(root: str) -> None:
    """Print a real directory on disk as a small tree."""
    for dirpath, dirnames, filenames in sorted(os.walk(root)):
        dirnames.sort()
        depth = dirpath[len(root):].count(os.sep)
        indent = "    " * depth
        print(f"{indent}{os.path.basename(dirpath) or dirpath}/")
        for name in sorted(filenames):
            print(f"{indent}    {name}")


# ---------------------------------------------------------------------------
# "Two names for every file": helpers that show where the agent's files really are.
# ---------------------------------------------------------------------------

def files_in(folder) -> set:
    """All files currently inside a real folder (used to spot new files after an agent run)."""
    folder = Path(folder)
    return {p for p in folder.rglob("*") if p.is_file()} if folder.exists() else set()


def show_folder(folder, before: set | None = None) -> None:
    """Print a real folder on your Mac as a tree. Files that did not exist in `before` are marked NEW."""
    folder = Path(folder)
    print(f"Folder on your Mac: {folder}")
    for path in sorted(folder.rglob("*")):
        depth = len(path.relative_to(folder).parts) - 1
        name = path.name + ("/" if path.is_dir() else "")
        mark = "   <== NEW" if before is not None and path.is_file() and path not in before else ""
        print("    " + "    " * depth + name + mark)


def where_did_files_go(result, label: str, disk_folders: dict | None = None,
                       store_folders: dict | None = None, other_folders: dict | None = None) -> None:
    """For every file the agent created or changed, print both of its names: the agent's and the real place.

    disk_folders:  {"/": APP} or {"/workspace/": APP}            -> a real folder on your Mac
    store_folders: {"/memories/": (store, ("alice", "memories"))} -> a drawer in a LangGraph store
    other_folders: {"/kb/": ("the SQL database kb.sqlite", backend)} -> any other backend
    Anything else lives in memory only. Files that are not on disk get a copy under
    notebooks/agent_files/<label>/ so you can still open them.
    """
    disk_folders, store_folders, other_folders = disk_folders or {}, store_folders or {}, other_folders or {}
    messages = result["messages"]
    last_human = max((i for i, m in enumerate(messages) if m.type == "human"), default=0)
    answers = {m.tool_call_id: m for m in messages[last_human:] if m.type == "tool"}
    touched = []
    for m in messages[last_human:]:
        for call in getattr(m, "tool_calls", []) or []:
            answer = answers.get(call["id"])
            ok = answer is not None and not _was_refused(answer.content if isinstance(answer.content, str) else "")
            path = call["args"].get("file_path")
            if call["name"] in ("write_file", "edit_file") and ok and path not in touched:
                touched.append(path)
    memory_files = result.get("files") or {}
    for path in memory_files:   # scratch files the agent saves automatically (not through write_file)
        if path.startswith(("/large_tool_results/", "/conversation_history/")) and path not in touched:
            touched.append(path)
    if not touched:
        print("The agent did not create or change any file in this step.")
        return

    def longest(prefixes, path):
        hits = sorted((p for p in prefixes if path.startswith(p)), key=len, reverse=True)
        return hits[0] if hits else None

    print("WHERE DID THE FILES GO?")
    print("-" * 78)
    for agent_name in touched:
        print(f"Agent's name for it : {agent_name}")
        prefix = longest(list(disk_folders) + list(store_folders) + list(other_folders), agent_name)
        inner = "/" + agent_name[len(prefix):].lstrip("/") if prefix else agent_name
        if prefix in disk_folders:
            real = Path(disk_folders[prefix]) / inner.lstrip("/")
            print(f"Where it really is  : ON YOUR DISK -> {real}")
            print(f"Can you open it?    : {'yes, click the path above' if real.exists() else 'no, it was not written'}")
        elif prefix in store_folders:
            store, namespace = store_folders[prefix]
            item = store.get(namespace, inner)
            print(f"Where it really is  : IN THE STORE (a database), drawer {namespace}, file {inner}")
            if item is not None:
                print(f"Copy you can open   : {_snapshot(SNAPSHOT_ROOT / label, agent_name, _content(item.value))}")
        elif prefix in other_folders:
            description, backend = other_folders[prefix]
            found = backend.read(inner)
            print(f"Where it really is  : IN {description}, saved under the name {inner}")
            if found.file_data:
                print(f"Copy you can open   : {_snapshot(SNAPSHOT_ROOT / label, agent_name, found.file_data['content'])}")
        elif agent_name in memory_files:
            print("Where it really is  : IN MEMORY ONLY (inside this conversation, never written to disk)")
            print(f"Copy you can open   : {_snapshot(SNAPSHOT_ROOT / label, agent_name, _content(memory_files[agent_name]))}")
        else:
            print("Where it really is  : nowhere, the write did not happen")
        print("-" * 78)
