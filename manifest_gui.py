
from pathlib import Path
from datetime import datetime, timezone
import json
import copy
import tkinter as tk

from tkinter import ttk, filedialog, messagebox

import subprocess
import time
import random
import re
import threading
import queue
import shutil

# === UI DIALOGS: Upload (GitHub / Google Drive) ================================================
class UploadDialog(tk.Toplevel):
    def __init__(self, master, on_done_callback):
        super().__init__(master)
        self.title("画像アップロード（GitHub / Google Drive）")
        self.transient(master)
        self.grab_set()
        self.resizable(True, False)
        self.on_done = on_done_callback

        self.cfg = load_config()

        # Common: file select & result URL
        frm_top = ttk.Frame(self)
        frm_top.pack(fill="x", padx=10, pady=(10,6))

        ttk.Label(frm_top, text="画像ファイル").grid(column=0, row=0, sticky="e")
        self.var_file = tk.StringVar()
        ent_file = ttk.Entry(frm_top, textvariable=self.var_file, width=56)
        ent_file.grid(column=1, row=0, sticky="ew", padx=6)
        ttk.Button(frm_top, text="参照…", command=self._choose_file).grid(column=2, row=0)
        frm_top.columnconfigure(1, weight=1)

        # Tabs for providers
        self.nb = ttk.Notebook(self)
        self.nb.pack(fill="x", padx=10)

        # --- GitHub tab ---
        tab_gh = ttk.Frame(self.nb)
        self.nb.add(tab_gh, text="GitHub")
        self.var_gh_owner = tk.StringVar(value=self.cfg.get("gh_owner", ""))
        self.var_gh_repo  = tk.StringVar(value=self.cfg.get("gh_repo", ""))
        self.var_gh_branch= tk.StringVar(value=self.cfg.get("gh_branch", "main"))
        self.var_gh_folder= tk.StringVar(value=self.cfg.get("gh_folder", "assets/wallpapers"))
        self.var_gh_token = tk.StringVar(value=self.cfg.get("gh_token", ""))
        self._add_row(tab_gh, 0, "Owner", self.var_gh_owner)
        self._add_row(tab_gh, 1, "Repo", self.var_gh_repo)
        self._add_row(tab_gh, 2, "Branch", self.var_gh_branch)
        self._add_row(tab_gh, 3, "Folder (先頭/末尾の/は任意)", self.var_gh_folder)
        self._add_row(tab_gh, 4, "Token (repo 権限)", self.var_gh_token)

        # --- Google Drive (rclone) tab ---
        tab_gd = ttk.Frame(self.nb)
        self.nb.add(tab_gd, text="Google Drive (rclone)")
        self.var_gd_remote = tk.StringVar(value=self.cfg.get("gdrive_remote", "gdrive"))
        self.var_gd_folder = tk.StringVar(value=self.cfg.get("gdrive_folder", "wallpapers"))
        self._add_row(tab_gd, 0, "rclone remote 名", self.var_gd_remote)
        self._add_row(tab_gd, 1, "フォルダ (例: wallpapers)", self.var_gd_folder)

        # Result URL (readonly)
        frm_res = ttk.Frame(self)
        frm_res.pack(fill="x", padx=10, pady=(6,4))
        ttk.Label(frm_res, text="取得URL").grid(column=0, row=0, sticky="e")
        self.var_url = tk.StringVar()
        ent_url = ttk.Entry(frm_res, textvariable=self.var_url, width=64)
        ent_url.grid(column=1, row=0, sticky="ew", padx=6)
        frm_res.columnconfigure(1, weight=1)

        # Post-upload: option to create a new wallpaper item automatically
        frm_new = ttk.Frame(self)
        frm_new.pack(fill="x", padx=10, pady=(0,6))
        self.var_create_item = tk.BooleanVar(value=False)
        self.var_new_id = tk.StringVar(value="")
        chk = ttk.Checkbutton(frm_new, text="アップ後に新しい壁紙項目として追加", variable=self.var_create_item)
        chk.grid(column=0, row=0, sticky="w")
        ttk.Label(frm_new, text="id (省略時はファイル名)").grid(column=1, row=0, sticky="e", padx=6)
        ent_newid = ttk.Entry(frm_new, textvariable=self.var_new_id, width=32)
        ent_newid.grid(column=2, row=0, sticky="w")
        for c in (0,1,2):
            frm_new.columnconfigure(c, weight=1 if c==2 else 0)

        # Progress + buttons
        frm_btn = ttk.Frame(self)
        frm_btn.pack(fill="x", padx=10, pady=(0,10))
        self.prog = ttk.Progressbar(frm_btn, mode="indeterminate")
        self.lbl_prog = ttk.Label(frm_btn, text="")
        self.prog.pack(side="left", fill="x", expand=True, padx=(0,8))
        self.lbl_prog.pack(side="left")

        self.btn_upload = ttk.Button(frm_btn, text="アップロード", command=self._start_upload)
        self.btn_close  = ttk.Button(frm_btn, text="閉じる", command=self.destroy)
        self.btn_upload.pack(side="right")
        self.btn_close.pack(side="right", padx=(0,6))

    def _add_row(self, parent, r, label, var):
        ttk.Label(parent, text=label).grid(column=0, row=r, sticky="e", padx=6, pady=4)
        e = ttk.Entry(parent, textvariable=var, width=44)
        e.grid(column=1, row=r, sticky="ew", padx=6)
        parent.columnconfigure(1, weight=1)

    def _choose_file(self):
        path = filedialog.askopenfilename(title="アップロードする画像を選択", filetypes=[("Images","*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp"), ("All files","*.*")])
        if path:
            self.var_file.set(path)

    def _set_busy(self, busy: bool, text: str = ""):
        if busy:
            self.btn_upload.configure(state="disabled")
            self.prog.start(12)
            self.lbl_prog.configure(text=text or "アップロード中…")
        else:
            self.btn_upload.configure(state="normal")
            self.prog.stop()
            self.lbl_prog.configure(text="")

    def _start_upload(self):
        fpath = self.var_file.get().strip()
        if not fpath:
            messagebox.showerror(APP_NAME, "画像ファイルを選択してください。")
            return
        provider = "github" if self.nb.index(self.nb.select()) == 0 else "gdrive"
        self._set_busy(True, "アップロード中…")

        q = queue.Queue()
        def worker():
            try:
                src = Path(fpath)
                mtype = guess_media_type(src)
                if provider == "github":
                    owner  = self.var_gh_owner.get().strip()
                    repo   = self.var_gh_repo.get().strip()
                    branch = self.var_gh_branch.get().strip() or "main"
                    folder = self.var_gh_folder.get().strip().strip("/")
                    token  = self.var_gh_token.get().strip()
                    if not (owner and repo and token):
                        raise RuntimeError("Owner/Repo/Token は必須です。")
                    dest_path = f"{folder}/{src.name}" if folder else src.name
                    url = github_upload_image(src, owner, repo, branch, dest_path, token, message=f"Add {src.name} from GUI")
                    # persist
                    cfg = load_config(); cfg.update({"gh_owner": owner, "gh_repo": repo, "gh_branch": branch, "gh_folder": folder, "gh_token": token}); save_config(cfg)
                else:
                    import shutil as _sh
                    if not _sh.which("rclone"):
                        raise RuntimeError("rclone が見つかりません。先に `rclone config` でセットアップしてください。")
                    remote = self.var_gd_remote.get().strip()
                    folder = self.var_gd_folder.get().strip().strip("/")
                    if not remote:
                        raise RuntimeError("remote 名は必須です。")
                    dest_path = f"{folder}/{src.name}" if folder else src.name
                    link = rclone_upload_and_link(src, remote, dest_path)
                    url = gdrive_share_to_embed(link)
                    # persist
                    cfg = load_config(); cfg.update({"gdrive_remote": remote, "gdrive_folder": folder}); save_config(cfg)
                q.put(("ok", provider, url, mtype, src.name))
            except Exception as e:
                q.put(("err", str(e)))

        threading.Thread(target=worker, daemon=True).start()

        def poll():
            try:
                item = q.get_nowait()
            except queue.Empty:
                self.after(80, poll)
                return
            self._set_busy(False)
            if item[0] == "ok":
                _prov, url, mtype, fname = item[1], item[2], item[3], item[4]
                self.var_url.set(url)
                # determine whether to create new item and what id to use
                want_create = bool(self.var_create_item.get())
                suggested = Path(fname).stem
                new_id = (self.var_new_id.get().strip() or suggested)
                options = {"create_item": want_create, "new_id": new_id}
                try:
                    if callable(self.on_done):
                        self.on_done(_prov, url, mtype, options)
                except Exception:
                    pass
            else:
                messagebox.showerror(APP_NAME, f"アップロードに失敗しました\n{item[1]}")
        poll()

# --- GitHub helpers: raw URL builder & directory listing ---

def github_raw_url(owner: str, repo: str, branch: str, path: str) -> str:
    path = path.lstrip('/')
    return f"https://github.com/{owner}/{repo}/raw/refs/heads/{branch}/{path}"


def github_list_contents(owner: str, repo: str, branch: str, path: str, token: str):
    """List files and folders at a path via GitHub Contents API. Returns a list of dicts.
    Each item keeps: type ('file'|'dir'), name, path, size.
    """
    import json as _json
    path = path.strip('/'); q = f"?ref={branch}" if branch else ""
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}{q}"
    hdr = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "manifest-gui-uploader/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    req = urllib.request.Request(url, method="GET", headers=hdr)
    with _urlopen_with_retry(req) as resp:
        data = _json.loads(resp.read().decode('utf-8'))
    out = []
    for it in data:
        t = it.get('type');
        if t not in ("file", "dir"): continue
        out.append({
            "type": t,
            "name": it.get('name',''),
            "path": it.get('path',''),
            "size": it.get('size', 0),
        })
    return out

# --- GitHub file picker dialog ---
class GitHubPickerDialog(tk.Toplevel):
    def __init__(self, master, on_pick_callback):
        super().__init__(master)
        self.title("GitHub から選択")
        self.transient(master)
        self.grab_set()
        self.resizable(True, True)
        self.on_pick = on_pick_callback
        self.cfg = load_config()

        # Top form
        frm = ttk.Frame(self); frm.pack(fill="x", padx=10, pady=8)
        self.var_owner  = tk.StringVar(value=self.cfg.get("gh_owner", ""))
        self.var_repo   = tk.StringVar(value=self.cfg.get("gh_repo", ""))
        self.var_branch = tk.StringVar(value=self.cfg.get("gh_branch", "main"))
        self.var_path   = tk.StringVar(value=self.cfg.get("gh_browse_path", ""))
        self.var_token  = tk.StringVar(value=self.cfg.get("gh_token", ""))
        self.var_filter = tk.StringVar(value="*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp")
        self.var_create_item = tk.BooleanVar(value=False)
        self.var_new_id = tk.StringVar(value="")
        def add(label, var, col):
            ttk.Label(frm, text=label).grid(column=col, row=0, sticky="e", padx=4)
            e = ttk.Entry(frm, textvariable=var, width=20)
            e.grid(column=col+1, row=0, sticky="w")
        add("Owner", self.var_owner, 0)
        add("Repo", self.var_repo, 2)
        add("Branch", self.var_branch, 4)
        # second line
        ttk.Label(frm, text="Path").grid(column=0, row=1, sticky="e", padx=4)
        ttk.Entry(frm, textvariable=self.var_path, width=46).grid(column=1, row=1, columnspan=3, sticky="ew")
        ttk.Label(frm, text="Token").grid(column=4, row=1, sticky="e", padx=4)
        ttk.Entry(frm, textvariable=self.var_token, width=20).grid(column=5, row=1, sticky="w")
        # third line: filter + create item
        ttk.Label(frm, text="Filter").grid(column=0, row=2, sticky="e", padx=4)
        ttk.Entry(frm, textvariable=self.var_filter, width=20).grid(column=1, row=2, sticky="w")
        ttk.Checkbutton(frm, text="選択後に新しい壁紙項目として追加", variable=self.var_create_item).grid(column=2, row=2, columnspan=2, sticky="w")
        ttk.Label(frm, text="id").grid(column=4, row=2, sticky="e", padx=4)
        ttk.Entry(frm, textvariable=self.var_new_id, width=20).grid(column=5, row=2, sticky="w")
        for c in range(6):
            frm.columnconfigure(c, weight=1 if c in (1,3) else 0)

        # Toolbar
        tb = ttk.Frame(self); tb.pack(fill="x", padx=10, pady=(0,6))
        ttk.Button(tb, text="Open", command=self._open_path).pack(side="left")
        ttk.Button(tb, text="Up", command=self._up).pack(side="left", padx=(6,0))
        self.lbl_status = ttk.Label(tb, text="")
        self.lbl_status.pack(side="right")

        # Browser tree
        self.tree = ttk.Treeview(self, columns=("name","size","path","type"), show="headings", selectmode="browse")
        for col, w in (("name", 260),("size",80),("path",480),("type",80)):
            self.tree.heading(col, text=col)
            self.tree.column(col, width=w, minwidth=60, stretch=True, anchor="w")
        xscroll = ttk.Scrollbar(self, orient="horizontal", command=self.tree.xview)
        self.tree.configure(xscrollcommand=xscroll.set)
        self.tree.pack(fill="both", expand=True, padx=10)
        xscroll.pack(fill="x", padx=10, pady=(0,8))
        self.tree.bind("<Double-1>", self._dblclick)

        # Bottom buttons
        frm_btm = ttk.Frame(self); frm_btm.pack(fill="x", padx=10, pady=8)
        ttk.Button(frm_btm, text="Select", command=self._select).pack(side="right")
        ttk.Button(frm_btm, text="Close", command=self.destroy).pack(side="right", padx=(0,6))

    def _matches_filter(self, name: str) -> bool:
        pat = (self.var_filter.get() or "*").split(";")
        name = name.lower()
        for p in pat:
            p = p.strip().lower()
            if not p:
                continue
            if p == "*" or (p.startswith("*.") and name.endswith(p[2:])):
                return True
        return False

    def _open_path(self):
        owner = self.var_owner.get().strip(); repo = self.var_repo.get().strip()
        branch = self.var_branch.get().strip() or "main"
        token = self.var_token.get().strip()
        path = self.var_path.get().strip()
        if not (owner and repo):
            messagebox.showerror(APP_NAME, "Owner/Repo は必須です。")
            return
        # persist for next time
        cfg = load_config(); cfg.update({"gh_owner": owner, "gh_repo": repo, "gh_branch": branch, "gh_browse_path": path, "gh_token": token}); save_config(cfg)
        try:
            items = github_list_contents(owner, repo, branch, path, token)
        except Exception as e:
            messagebox.showerror(APP_NAME, f"取得に失敗しました:\n{e}")
            return
        self.tree.delete(*self.tree.get_children())
        # Show folders first, then files (filtered)
        dirs = [it for it in items if it['type']=="dir"]
        files = [it for it in items if it['type']=="file" and self._matches_filter(it['name'])]
        for it in dirs + files:
            self.tree.insert("", "end", values=(it['name'], it.get('size',0), it['path'], it['type']))
        self.lbl_status.configure(text=f"{len(dirs)} dirs, {len(files)} files")

    def _up(self):
        p = self.var_path.get().strip().strip('/')
        if not p:
            return
        parent = '/'.join(p.split('/')[:-1])
        self.var_path.set(parent)
        self._open_path()

    def _dblclick(self, _evt):
        sel = self.tree.selection()
        if not sel:
            return
        name, _size, path, typ = self.tree.item(sel[0], 'values')
        if typ == 'dir':
            self.var_path.set(path)
            self._open_path()

    def _select(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showinfo(APP_NAME, "ファイルを選択してください。")
            return
        name, _size, path, typ = self.tree.item(sel[0], 'values')
        if typ != 'file':
            messagebox.showinfo(APP_NAME, "フォルダではなくファイルを選択してください。")
            return
        owner = self.var_owner.get().strip(); repo = self.var_repo.get().strip()
        branch = self.var_branch.get().strip() or "main"
        url = github_raw_url(owner, repo, branch, path)
        mtype = guess_media_type(Path(name))
        # Persist settings
        cfg = load_config(); cfg.update({"gh_owner": owner, "gh_repo": repo, "gh_branch": branch, "gh_browse_path": self.var_path.get().strip()}); save_config(cfg)
        create = bool(self.var_create_item.get())
        new_id = self.var_new_id.get().strip() or Path(name).stem
        if callable(self.on_pick):
            self.on_pick(url, mtype, {"create_item": create, "new_id": new_id})
        self.destroy()

# === HELPERS: Links / MIME / Network / Providers ================================================
# --- Google Drive link normalization (share URL -> embeddable URL) ---
def gdrive_share_to_embed(url: str) -> str:
    """
    Convert a Google Drive share link (open/file/d/uc?) into an embeddable image URL.
    Prefers the lh3 CDN form which works well in <img src> etc.
    Fallback to the uc?export=download form if ID is not found.
    """
    # Try to extract file id from typical patterns
    #   https://drive.google.com/file/d/<ID>/view?...
    #   https://drive.google.com/open?id=<ID>
    #   https://drive.google.com/uc?export=download&id=<ID>
    m = re.search(r"(?:/d/|id=)([A-Za-z0-9_-]{10,})", url)
    if not m:
        return url  # unknown format; return as-is
    fid = m.group(1)
    # Prefer lh3 CDN for direct image embedding
    return f"https://lh3.googleusercontent.com/d/{fid}"

import base64
import mimetypes
import urllib.request
import urllib.error
def guess_media_type(path: Path) -> str:
    mtype, _ = mimetypes.guess_type(str(path))
    return mtype or "application/octet-stream"


def _urlopen_with_retry(req, max_tries=5, base_delay=0.4, timeout=30):
    """urllib opener with exponential backoff. Raises on final failure."""
    last_err = None
    for attempt in range(1, max_tries + 1):
        try:
            return urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError as e:
            # 429/5xx はリトライ、それ以外は即失敗
            if e.code in (429, 500, 502, 503, 504):
                last_err = e
            else:
                raise
        except urllib.error.URLError as e:
            last_err = e
        # backoff
        delay = base_delay * (2 ** (attempt - 1)) * (1 + 0.1 * random.random())
        time.sleep(min(delay, 8.0))
    if last_err:
        raise last_err


def rclone_upload_and_link(file_path: Path, remote: str, dest_path: str) -> str:
    """
    Use rclone to upload a file to Google Drive (or any rclone remote) and return a public link.
    Requirements:
      - `rclone` installed and configured (e.g., remote name `gdrive` with OAuth done).
      - The remote supports `rclone link` (Google Drive など)。
    """
    # copy
    src = str(file_path)
    dst = f"{remote}:{dest_path}"
    cp = subprocess.run(["rclone", "copyto", src, dst, "-q"], capture_output=True, text=True)
    if cp.returncode != 0:
        raise RuntimeError(f"rclone copyto failed: {cp.stderr.strip() or cp.stdout.strip()}")
    # get share link
    lk = subprocess.run(["rclone", "link", dst], capture_output=True, text=True)
    if lk.returncode != 0:
        raise RuntimeError(f"rclone link failed: {lk.stderr.strip() or lk.stdout.strip()}")
    url = lk.stdout.strip()
    return url


def github_upload_image(file_path: Path, owner: str, repo: str, branch: str, dest_path: str, token: str, message: str = None) -> str:
    """
    Uploads a file to GitHub repo via Contents API with retry. Returns the RAW URL on success.
    If the path exists, it updates the file (includes sha).
    """
    if not message:
        message = f"Add {dest_path}"
    with file_path.open('rb') as f:
        content_b64 = base64.b64encode(f.read()).decode('ascii')
    api_base = f"https://api.github.com/repos/{owner}/{repo}/contents/{dest_path}"
    COMMON_HDR = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "manifest-gui-uploader/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    # GET to check existing (sha)
    sha = None
    req_get = urllib.request.Request(api_base, method="GET", headers=COMMON_HDR)
    try:
        with _urlopen_with_retry(req_get) as resp:
            import json as _json
            data = _json.loads(resp.read().decode('utf-8'))
            sha = data.get('sha')
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise
    import json as _json
    payload = {"message": message, "content": content_b64, "branch": branch}
    if sha:
        payload["sha"] = sha
    data_bytes = _json.dumps(payload).encode('utf-8')
    req_put = urllib.request.Request(
        api_base,
        data=data_bytes,
        method="PUT",
        headers={**COMMON_HDR, "Content-Type": "application/json"}
    )
    try:
        with _urlopen_with_retry(req_put) as resp:
            _ = resp.read()
    except urllib.error.HTTPError as e:
        # Read body text (may be JSON) and response headers for diagnostics
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            body = ""
        headers_map = {}
        try:
            # e.headers can be email.message.Message; convert to dict of interest
            for k in [
                "x-ratelimit-remaining", "x-ratelimit-limit", "x-ratelimit-reset",
                "x-github-sso", "x-accepted-oauth-scopes", "x-oauth-scopes"
            ]:
                v = e.headers.get(k) if getattr(e, 'headers', None) else None
                if v:
                    headers_map[k] = v
        except Exception:
            pass
        # Extract JSON fields if possible
        err_lines = []
        try:
            import json as _json
            j = _json.loads(body) if body else {}
            msg = j.get("message")
            doc = j.get("documentation_url")
            errors = j.get("errors")
            if isinstance(msg, str) and msg:
                err_lines.append(msg)
            if isinstance(errors, list) and errors:
                # Collect concise error details
                for it in errors[:5]:
                    if isinstance(it, dict):
                        # common keys: resource, field, code, message
                        parts = []
                        for key in ("resource", "field", "code", "message"):
                            val = it.get(key)
                            if val:
                                parts.append(f"{key}={val}")
                        if parts:
                            err_lines.append("error: " + ", ".join(parts))
                    elif isinstance(it, str):
                        err_lines.append(it)
            if doc:
                err_lines.append(f"docs: {doc}")
        except Exception:
            # Fallback: raw body
            if body:
                err_lines.append(body)
        # Add hints from headers
        if headers_map:
            # Rate limit info
            rem = headers_map.get("x-ratelimit-remaining")
            lim = headers_map.get("x-ratelimit-limit")
            rst = headers_map.get("x-ratelimit-reset")
            sso = headers_map.get("x-github-sso")
            scopes_needed = headers_map.get("x-accepted-oauth-scopes")
            scopes_have = headers_map.get("x-oauth-scopes")
            meta = []
            if rem or lim:
                meta.append(f"rate-limit: {rem or '?'} / {lim or '?'}")
            if rst:
                meta.append(f"reset-epoch: {rst}")
            if scopes_needed:
                meta.append(f"accepted-scopes: {scopes_needed}")
            if scopes_have:
                meta.append(f"token-scopes: {scopes_have}")
            if sso:
                meta.append(f"sso: {sso}")
            if meta:
                err_lines.append("; ".join(meta))
        # Common actionable hints
        hints = []
        # Branch protection typical message
        try:
            if any("protected" in s.lower() and "branch" in s.lower() for s in err_lines):
                hints.append("Hint: The target branch may be protected. Try uploading to a different branch (e.g., 'uploads') and merge via PR.")
        except Exception:
            pass
        # Resource access / scopes
        try:
            if any("not accessible" in s.lower() or "must have" in s.lower() for s in err_lines):
                hints.append("Hint: Verify the token is Fine-grained with 'Contents: Read and write' and the repository is selected.")
        except Exception:
            pass
        if hints:
            err_lines.extend(hints)
        pretty = ("\n".join(err_lines)).strip() or f"HTTP {e.code}"
        raise RuntimeError(f"GitHub API error {e.code}:\n{pretty}")
    raw_url = f"https://github.com/{owner}/{repo}/raw/refs/heads/{branch}/{dest_path}"
    # Light verification of reachability
    try:
        with _urlopen_with_retry(urllib.request.Request(raw_url, method="GET")) as _check:
            pass
    except Exception:
        # GitHub raw sometimes delays; best-effort only
        time.sleep(0.5)
    return raw_url

APP_NAME = "Manifest GUI (safe)"
CONFIG_PATH = Path.home() / ".kb_manifest_gui.json"
DEFAULT_MANIFEST_BASENAME = "wallpapers.manifest.json"

def load_config():
    try:
        if CONFIG_PATH.exists():
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}

def save_config(cfg):
    try:
        CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

def semver_bump_patch(ver: str) -> str:
    try:
        parts = [int(x) for x in ver.split(".")]
        while len(parts) < 3:
            parts.append(0)
        parts[2] += 1
        return ".".join(map(str, parts[:3]))
    except Exception:
        return "1.0.1"

def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

def default_manifest():
    return {
        "manifestVersion": "1.0.0",
        "updatedAt": now_iso(),
        "apps": ["browser", "discord"],
        "defaults": {
            "style": {
                "backgroundPosition": "center center",
                "backgroundSize": "cover",
                "backgroundRepeat": "no-repeat",
                "opacity": 1.0
            }
        },
        "wallpapers": []
    }

def atomic_write_text(path: Path, text: str):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)

class ManifestModel:
    def __init__(self):
        self.path = None
        self.data = default_manifest()

    def load(self, path: Path):
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        data.setdefault("defaults", {}).setdefault("style", {})
        data.setdefault("wallpapers", [])
        self.path = path
        self.data = data

    def save(self):
        if not self.path:
            raise RuntimeError("No path to save")
        text = json.dumps(self.data, ensure_ascii=False, indent=2)
        atomic_write_text(self.path, text)

    def set_path(self, path: Path):
        self.path = path

    def bump_and_stamp(self):
        ver = self.data.get("manifestVersion", "1.0.0")
        self.data["manifestVersion"] = semver_bump_patch(ver)
        self.data["updatedAt"] = now_iso()

    def wallpapers(self):
        return self.data.get("wallpapers", [])

    def ensure_unique_id(self, candidate: str, skip_index=None) -> bool:
        c = candidate.strip()
        if not c:
            return False
        for i, w in enumerate(self.wallpapers()):
            if skip_index is not None and i == skip_index:
                continue
            if w.get("id") == c:
                return False
        return True

class SourcesEditor(ttk.Frame):
    def __init__(self, master, on_dirty):
        super().__init__(master)
        self.on_dirty = on_dirty
        self.rows = []
        header = ttk.Frame(self)
        header.grid(column=0, row=0, sticky="ew", pady=(0,4))
        for i, text in enumerate(["provider", "id (URL or key)", "mediaType", ""]):
            ttk.Label(header, text=text).grid(column=i, row=0, padx=4)
        self.body = ttk.Frame(self)
        self.body.grid(column=0, row=1, sticky="nsew")
        self.body.columnconfigure(0, weight=1)
        self.add_btn = ttk.Button(self, text="+ 画像ソースを追加", command=self.add_row)
        self.add_btn.grid(column=0, row=2, sticky="w", pady=8)
        self.columnconfigure(0, weight=1)

    def fill_current_or_new(self, provider: str, url: str, media_type: str):
        # Try to find a selected/last row with empty fields
        target = None
        for t in self.rows:
            (_f, e_p, e_id, e_t) = t
            if not e_id.get().strip():
                target = t
                break
        if target is None:
            self.add_row()
            target = self.rows[-1]
        (_f, e_p, e_id, e_t) = target
        e_p.delete(0, 'end'); e_p.insert(0, provider)
        e_id.delete(0, 'end'); e_id.insert(0, url)
        e_t.delete(0, 'end'); e_t.insert(0, media_type)
        if callable(self.on_dirty):
            self.on_dirty()

    def add_row(self, prefill=None):
        i = len(self.rows)
        frame = ttk.Frame(self.body)
        frame.grid(column=0, row=i, sticky="ew", pady=2)
        frame.columnconfigure(0, weight=1)
        frame.columnconfigure(1, weight=3)
        frame.columnconfigure(2, weight=1)
        e_provider = ttk.Entry(frame, width=12)
        e_id = ttk.Entry(frame, width=48)
        e_type = ttk.Entry(frame, width=12)
        btn_del = ttk.Button(frame, text="削除", width=6, command=lambda: self._delete_row(frame))
        for c, w in enumerate([e_provider, e_id, e_type, btn_del]):
            w.grid(column=c, row=0, padx=4, sticky="ew")
        if prefill:
            e_provider.insert(0, prefill.get("provider", ""))
            e_id.insert(0, prefill.get("id", ""))
            e_type.insert(0, prefill.get("mediaType", ""))
        for e in (e_provider, e_id, e_type):
            e.bind("<KeyRelease>", lambda _e: self.on_dirty())
        # Add a horizontal scrollbar for the id entry
        sb = ttk.Scrollbar(frame, orient="horizontal", command=e_id.xview)
        e_id.configure(xscrollcommand=sb.set)
        sb.grid(column=0, row=1, columnspan=3, sticky="ew", padx=4)
        self.rows.append((frame, e_provider, e_id, e_type))

    def _delete_row(self, frame):
        for idx, (f, *_rest) in enumerate(self.rows):
            if f == frame:
                for w in f.winfo_children():
                    w.destroy()
                f.destroy()
                self.rows.pop(idx)
                for i, (ff, *_r) in enumerate(self.rows):
                    ff.grid_configure(row=i)
                self.on_dirty()
                break

    def get_value(self):
        out = []
        for (_f, e_p, e_id, e_t) in self.rows:
            provider = e_p.get().strip()
            sid = e_id.get().strip()
            mtype = e_t.get().strip()
            if provider or sid or mtype:
                if not (provider and sid and mtype):
                    raise ValueError("sources の各行は provider/id/mediaType をすべて入力してください。")
                out.append({"provider": provider, "id": sid, "mediaType": mtype})
        return out

    def set_value(self, sources):
        for (f, *_r) in self.rows:
            for w in f.winfo_children():
                w.destroy()
            f.destroy()
        self.rows.clear()
        sources = sources or []
        if not sources:
            self.add_row()
        else:
            for s in sources:
                self.add_row(s)

class WallpaperForm(ttk.LabelFrame):
    def __init__(self, master):
        super().__init__(master, text="壁紙の編集")
        self._dirty = False
        def mark_dirty(*_): 
            self._dirty = True

        self.var_id = tk.StringVar(); self.var_id.trace_add("write", mark_dirty)
        self.var_title = tk.StringVar(); self.var_title.trace_add("write", mark_dirty)
        self.var_nsfw = tk.BooleanVar(value=False); self.var_nsfw.trace_add("write", mark_dirty)
        self.var_tags = tk.StringVar(); self.var_tags.trace_add("write", mark_dirty)
        self.var_required = tk.StringVar(value="0"); self.var_required.trace_add("write", mark_dirty)
        self.var_pos = tk.StringVar(value="center center"); self.var_pos.trace_add("write", mark_dirty)
        self.var_size = tk.StringVar(value="cover"); self.var_size.trace_add("write", mark_dirty)
        self.var_repeat = tk.StringVar(value="no-repeat"); self.var_repeat.trace_add("write", mark_dirty)
        self.var_opacity = tk.StringVar(value="1.0"); self.var_opacity.trace_add("write", mark_dirty)

        r = 0
        ttk.Label(self, text="id").grid(column=0, row=r, sticky="e", padx=6, pady=2); 
        ttk.Entry(self, textvariable=self.var_id, width=28).grid(column=1, row=r, sticky="w", padx=6); r+=1
        ttk.Label(self, text="title").grid(column=0, row=r, sticky="e", padx=6, pady=2); 
        ttk.Entry(self, textvariable=self.var_title, width=28).grid(column=1, row=r, sticky="w", padx=6); r+=1
        ttk.Label(self, text="tags（カンマ区切り）").grid(column=0, row=r, sticky="e", padx=6, pady=2); 
        ttk.Entry(self, textvariable=self.var_tags, width=28).grid(column=1, row=r, sticky="w", padx=6); r+=1
        ttk.Label(self, text="requiredLevel").grid(column=0, row=r, sticky="e", padx=6, pady=2); 
        ttk.Entry(self, textvariable=self.var_required, width=10).grid(column=1, row=r, sticky="w", padx=6); r+=1
        ttk.Label(self, text="nsfw").grid(column=0, row=r, sticky="e", padx=6, pady=2); 
        ttk.Checkbutton(self, variable=self.var_nsfw).grid(column=1, row=r, sticky="w", padx=6); r+=1

        ttk.Separator(self).grid(column=0, row=r, columnspan=4, sticky="ew", pady=4); r+=1
        ttk.Label(self, text="style.backgroundPosition").grid(column=0, row=r, sticky="e", padx=6, pady=2)
        ttk.Entry(self, textvariable=self.var_pos, width=28).grid(column=1, row=r, sticky="w", padx=6); r+=1
        ttk.Label(self, text="style.backgroundSize").grid(column=0, row=r, sticky="e", padx=6, pady=2)
        ttk.Entry(self, textvariable=self.var_size, width=28).grid(column=1, row=r, sticky="w", padx=6); r+=1
        ttk.Label(self, text="style.backgroundRepeat").grid(column=0, row=r, sticky="e", padx=6, pady=2)
        ttk.Entry(self, textvariable=self.var_repeat, width=28).grid(column=1, row=r, sticky="w", padx=6); r+=1
        ttk.Label(self, text="style.opacity (0..1)").grid(column=0, row=r, sticky="e", padx=6, pady=2)
        ttk.Entry(self, textvariable=self.var_opacity, width=10).grid(column=1, row=r, sticky="w", padx=6); r+=1

        ttk.Separator(self).grid(column=0, row=r, columnspan=4, sticky="ew", pady=4); r+=1
        # Place the label above and let the editor span full width (two columns)
        ttk.Label(self, text="sources").grid(column=0, row=r, columnspan=2, sticky="w", padx=6, pady=(6,2)); r+=1
        self.sources = SourcesEditor(self, on_dirty=lambda: setattr(self, "_dirty", True))
        self.sources.grid(column=0, row=r, columnspan=2, sticky="nsew", padx=6); r+=1

        self.columnconfigure(0, weight=0)
        self.columnconfigure(1, weight=1)
        self.rowconfigure(r-1, weight=1)

    def is_dirty(self):
        return self._dirty

    def reset_dirty(self):
        self._dirty = False

    def to_dict(self):
        try:
            opacity = float(self.var_opacity.get().strip())
        except ValueError:
            raise ValueError("opacity は数値で指定してください。")
        if not (0.0 <= opacity <= 1.0):
            raise ValueError("opacity は 0.0〜1.0 の範囲で指定してください。")
        try:
            required = int(self.var_required.get().strip() or "0")
        except ValueError:
            raise ValueError("requiredLevel は整数で指定してください。")

        tags = [t.strip() for t in self.var_tags.get().split(",") if t.strip()]
        w = {
            "id": self.var_id.get().strip(),
            "title": self.var_title.get().strip() or self.var_id.get().strip(),
            "sources": self.sources.get_value(),
            "style": {
                "backgroundPosition": self.var_pos.get().strip() or "center center",
                "backgroundSize": self.var_size.get().strip() or "cover",
                "backgroundRepeat": self.var_repeat.get().strip() or "no-repeat",
                "opacity": opacity,
            },
            "nsfw": bool(self.var_nsfw.get()),
            "tags": tags,
            "requiredLevel": int(required)
        }
        if not w["id"]:
            raise ValueError("id は必須です。")
        return w

    def set_from(self, w):
        self.reset_dirty()
        self.var_id.set(w.get("id",""))
        self.var_title.set(w.get("title",""))
        self.var_nsfw.set(bool(w.get("nsfw", False)))
        self.var_required.set(str(w.get("requiredLevel", 0)))
        self.var_tags.set(", ".join(w.get("tags", [])))
        style = w.get("style", {})
        self.var_pos.set(style.get("backgroundPosition","center center"))
        self.var_size.set(style.get("backgroundSize","cover"))
        self.var_repeat.set(style.get("backgroundRepeat","no-repeat"))
        self.var_opacity.set(str(style.get("opacity", 1.0)))
        self.sources.set_value(w.get("sources", []))
        self.reset_dirty()

# -------------------------------------------------------------------------------
# === UI MAIN APP ================================================================================
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_NAME)
        self.geometry("1024x680")
        self.minsize(960, 600)

        self.model = ManifestModel()
        self.cfg = load_config()
        if self.cfg.get("manifest_path"):
            p = Path(self.cfg["manifest_path"])
            if p.exists():
                try:
                    self.model.load(p)
                except Exception:
                    pass

        self._last_selected_iid = None

        self.create_widgets()
        self.create_menubar()
        self.bind_shortcuts()
        self.refresh_tree(select_first=True)

    def create_menubar(self):
        menubar = tk.Menu(self)
        # File menu (placeholder for future)
        filemenu = tk.Menu(menubar, tearoff=0)
        filemenu.add_command(label="開く…", command=self.on_open)
        filemenu.add_command(label="保存（ver自動UP）", command=self.on_save)
        filemenu.add_separator()
        filemenu.add_command(label="終了", command=self.destroy)
        menubar.add_cascade(label="ファイル", menu=filemenu)

        upload = tk.Menu(menubar, tearoff=0)
        upload.add_command(label="画像アップ（統合GUI）…", command=self.menu_upload_any)
        upload.add_command(label="GitHub から選択して追加…", command=self.menu_pick_github)
        upload.add_command(label="画像をGitHubにアップロード…", command=self.menu_upload_github)
        # 予備: 将来の Google Drive 実装用
        upload.add_command(label="画像をGoogle Driveにアップロード…", command=self.menu_upload_gdrive_placeholder)
        menubar.add_cascade(label="アップロード", menu=upload)

        self.config(menu=menubar)

    def menu_upload_any(self):
        def _on_done(provider, url, mtype, options=None):
            opts = options or {}
            if opts.get("create_item"):
                # Create a new wallpaper with this single source
                new_id = opts.get("new_id") or "wallpaper"
                self.add_new_wallpaper_from_source(new_id, provider, url, mtype)
                self.set_status("新しい壁紙項目を追加しました。")
            else:
                try:
                    self.form.sources.fill_current_or_new(provider, url, mtype)
                    self.set_status(f"{provider} にアップロードし、sources に反映しました。")
                except Exception:
                    messagebox.showinfo(APP_NAME, f"アップロード成功:\n{url}")
        UploadDialog(self, on_done_callback=_on_done)

    def add_new_wallpaper_from_source(self, new_id: str, provider: str, url: str, mtype: str):
        # Ensure unique id
        ws = self.model.wallpapers()
        base = new_id.strip() or "wallpaper"
        candidate = base
        taken = {w.get("id","") for w in ws}
        c = 1
        while candidate in taken:
            c += 1
            candidate = f"{base}-{c}"
        item = {
            "id": candidate,
            "title": candidate,
            "sources": [{"provider": provider, "id": url, "mediaType": mtype}],
            "style": {
                "backgroundPosition": "center center",
                "backgroundSize": "cover",
                "backgroundRepeat": "no-repeat",
                "opacity": 1.0
            },
            "nsfw": False,
            "tags": [],
            "requiredLevel": 0
        }
        ws.append(item)
        self.refresh_tree(select_first=False)
        new_iid = str(len(ws)-1)
        self.tree.selection_set(new_iid)
        self._last_selected_iid = new_iid
        self.load_form_from_selected()

    def menu_pick_github(self):
        def _on_pick(url, mtype, options=None):
            opts = options or {}
            if opts.get("create_item"):
                new_id = opts.get("new_id") or "wallpaper"
                self.add_new_wallpaper_from_source(new_id, "github", url, mtype)
                self.set_status("GitHub から選択して新しい壁紙項目を追加しました。")
            else:
                try:
                    self.form.sources.fill_current_or_new("github", url, mtype)
                    self.set_status("GitHub から選択し、sources に反映しました。")
                except Exception:
                    messagebox.showinfo(APP_NAME, f"選択したURL:\n{url}")
        GitHubPickerDialog(self, on_pick_callback=_on_pick)

    def menu_upload_gdrive_placeholder(self):
        # rclone 経由の簡易アップロード (要: 事前に `rclone config` で remote 作成)
        if not shutil.which("rclone"):
            messagebox.showinfo(APP_NAME, "Google Drive 連携: rclone が見つかりません。\n\n1) `rclone config` で Google Drive を設定 (例: remote 名 gdrive)\n2) 本アプリのメニューから再度お試しください。\n\n※ 完全内蔵のOAuth実装も可能ですが、初期設定が複雑なため rclone を推奨します。")
            return
        cfg = load_config()
        gd_remote = cfg.get("gdrive_remote", "gdrive")
        gd_folder = cfg.get("gdrive_folder", "wallpapers")
        file_path = filedialog.askopenfilename(title="アップロードする画像を選択", filetypes=[("Images","*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp"), ("All files","*.*")])
        if not file_path:
            return
        top = tk.Toplevel(self)
        top.title("Google Drive (rclone) アップロード")
        top.grab_set()
        def add_row(label, var):
            r = add_row.row
            ttk.Label(top, text=label).grid(column=0, row=r, sticky="e", padx=6, pady=4)
            e = ttk.Entry(top, textvariable=var, width=40)
            e.grid(column=1, row=r, sticky="w", padx=6)
            add_row.row += 1
            return e
        add_row.row = 0
        var_remote = tk.StringVar(value=gd_remote)
        var_folder = tk.StringVar(value=gd_folder)
        add_row("rclone remote 名", var_remote)
        add_row("フォルダ (例: wallpapers)", var_folder)
        btns = ttk.Frame(top); btns.grid(column=0, row=add_row.row, columnspan=2, sticky="e", pady=8)
        def on_ok():
            remote = var_remote.get().strip()
            folder = var_folder.get().strip().strip("/")
            if not remote:
                messagebox.showerror(APP_NAME, "remote 名は必須です。")
                return
            src = Path(file_path)
            dest_path = f"{folder}/{src.name}" if folder else src.name
            try:
                url = rclone_upload_and_link(src, remote, dest_path)
            except Exception as e:
                messagebox.showerror(APP_NAME, f"アップロードに失敗しました:\n{e}")
                return
            # Normalize Google Drive share link to an embeddable URL
            embed_url = gdrive_share_to_embed(url)
            # 設定保存
            cfg = load_config(); cfg.update({"gdrive_remote": remote, "gdrive_folder": folder}); save_config(cfg)
            # sources への反映
            mtype = guess_media_type(src)
            try:
                self.form.sources.fill_current_or_new("gdrive", embed_url, mtype)
                self.set_status("Google Drive (rclone) にアップロードし、sources に反映しました。")
            except Exception:
                messagebox.showinfo(APP_NAME, f"アップロード成功:\n{url}")
            top.destroy()
        ttk.Button(btns, text="アップロードして反映", command=on_ok).pack(side="right", padx=6)
        ttk.Button(btns, text="キャンセル", command=top.destroy).pack(side="right", padx=6)
        for c in range(2):
            top.columnconfigure(c, weight=1)

    def menu_upload_github(self):
        # Read defaults from config
        cfg = load_config()
        gh_owner = cfg.get("gh_owner", "")
        gh_repo = cfg.get("gh_repo", "")
        gh_branch = cfg.get("gh_branch", "main")
        gh_folder = cfg.get("gh_folder", "assets/wallpapers")
        gh_token = cfg.get("gh_token", "")

        file_path = filedialog.askopenfilename(title="アップロードする画像を選択", filetypes=[("Images","*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp"), ("All files","*.*")])
        if not file_path:
            return

        top = tk.Toplevel(self)
        top.title("GitHub アップロード設定")
        top.grab_set()

        def add_row(label, var):
            r = add_row.row
            ttk.Label(top, text=label).grid(column=0, row=r, sticky="e", padx=6, pady=4)
            e = ttk.Entry(top, textvariable=var, width=40)
            e.grid(column=1, row=r, sticky="w", padx=6)
            add_row.row += 1
            return e
        add_row.row = 0

        var_owner = tk.StringVar(value=gh_owner)
        var_repo = tk.StringVar(value=gh_repo)
        var_branch = tk.StringVar(value=gh_branch)
        var_folder = tk.StringVar(value=gh_folder)
        var_token = tk.StringVar(value=gh_token)

        add_row("Owner", var_owner)
        add_row("Repo", var_repo)
        add_row("Branch", var_branch)
        add_row("Folder (先頭/末尾の/は任意)", var_folder)
        add_row("Token (repo 権限)", var_token)

        btns = ttk.Frame(top); btns.grid(column=0, row=add_row.row, columnspan=2, sticky="e", pady=8)
        def on_ok():
            owner = var_owner.get().strip()
            repo = var_repo.get().strip()
            branch = var_branch.get().strip() or "main"
            folder = var_folder.get().strip().strip("/")
            token = var_token.get().strip()
            if not (owner and repo and token):
                messagebox.showerror(APP_NAME, "Owner/Repo/Token は必須です。")
                return
            # Compute destination path under folder with original filename
            src = Path(file_path)
            dest_path = f"{folder}/{src.name}" if folder else src.name
            try:
                url = github_upload_image(src, owner, repo, branch, dest_path, token, message=f"Add {src.name} from GUI")
            except Exception as e:
                messagebox.showerror(APP_NAME, f"アップロードに失敗しました:\n{e}")
                return
            # Save defaults for next time
            cfg = load_config()
            cfg.update({"gh_owner": owner, "gh_repo": repo, "gh_branch": branch, "gh_folder": folder, "gh_token": token})
            save_config(cfg)
            # Fill current sources row (provider=github, id=url, mediaType=guessed)
            mtype = guess_media_type(Path(file_path))
            try:
                self.form.sources.fill_current_or_new("github", url, mtype)
                self.set_status("GitHubにアップロードし、sources に反映しました。")
            except Exception:
                # If form is not ready, just show the URL
                messagebox.showinfo(APP_NAME, f"アップロード成功:\n{url}")
            top.destroy()

        ttk.Button(btns, text="アップロードして反映", command=on_ok).pack(side="right", padx=6)
        ttk.Button(btns, text="キャンセル", command=top.destroy).pack(side="right", padx=6)

        for c in range(2):
            top.columnconfigure(c, weight=1)

    def create_widgets(self):
        toolbar = ttk.Frame(self)
        toolbar.pack(side="top", fill="x")

        self.path_var = tk.StringVar(value=str(self.model.path) if self.model.path else "")
        ttk.Label(toolbar, text="マニフェスト:").pack(side="left", padx=(8,4))
        self.path_entry = ttk.Entry(toolbar, textvariable=self.path_var, width=80)
        self.path_entry.pack(side="left", padx=4, fill="x", expand=True)
        ttk.Button(toolbar, text="開く…", command=self.on_open).pack(side="left", padx=4)
        ttk.Button(toolbar, text="新規作成", command=self.on_new).pack(side="left", padx=4)
        ttk.Button(toolbar, text="保存（ver自動UP）", command=self.on_save).pack(side="left", padx=4)

        main = ttk.Panedwindow(self, orient="horizontal")
        main.pack(side="top", fill="both", expand=True, pady=6)

        left = ttk.Frame(main)
        self.tree = ttk.Treeview(left, columns=("id","title","nsfw","level","tags"), show="headings", selectmode="browse")
        for col, w in [("id", 200), ("title", 220), ("nsfw", 60), ("level", 80), ("tags", 260)]:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=w, minwidth=80, stretch=True, anchor="w")
        xscroll = ttk.Scrollbar(left, orient="horizontal", command=self.tree.xview)
        self.tree.configure(xscrollcommand=xscroll.set)
        self.tree.pack(side="top", fill="both", expand=True, padx=6, pady=(0,6))
        xscroll.pack(side="top", fill="x", padx=6, pady=(0,4))

        btns = ttk.Frame(left)
        ttk.Button(btns, text="+ 追加 (Ctrl+N)", command=self.add_wallpaper).pack(side="left", padx=4)
        ttk.Button(btns, text="複製 (Ctrl+D)", command=self.dup_wallpaper).pack(side="left", padx=4)
        ttk.Button(btns, text="削除 (Del)", command=self.del_wallpaper).pack(side="left", padx=4)
        btns.pack(side="top", fill="x", padx=6, pady=(0,6))
        self.tree.bind("<<TreeviewSelect>>", self.on_select_tree)

        right = ttk.Frame(main)
        self.form = WallpaperForm(right)
        self.form.pack(side="top", fill="both", expand=True, padx=6, pady=6)
        self.btn_apply = ttk.Button(right, text="変更を反映（左リストへ）", command=self.apply_form_to_selected)
        self.btn_apply.pack(side="top", anchor="e", padx=6, pady=(0,6))

        main.add(left, weight=1)
        main.add(right, weight=2)

        self.status_var = tk.StringVar(value="")
        status = ttk.Frame(self)
        ttk.Label(status, textvariable=self.status_var).pack(side="left", padx=8)
        status.pack(side="bottom", fill="x")

    def bind_shortcuts(self):
        self.bind_all("<Control-s>", lambda e: self.on_save())
        self.bind_all("<Control-S>", lambda e: self.on_save())
        self.bind_all("<Control-n>", lambda e: self.add_wallpaper())
        self.bind_all("<Control-N>", lambda e: self.add_wallpaper())
        self.bind_all("<Control-d>", lambda e: self.dup_wallpaper())
        self.bind_all("<Control-D>", lambda e: self.dup_wallpaper())
        self.bind_all("<Delete>", lambda e: self.del_wallpaper())

    def set_status(self, text):
        self.status_var.set(text)
        self.after(4000, lambda: self.status_var.set(""))

    def on_open(self):
        if not self.confirm_discard_or_apply():
            return
        path = filedialog.askopenfilename(
            title="マニフェストを選択",
            filetypes=[("JSON files","*.json"), ("All files","*.*")],
            initialfile=DEFAULT_MANIFEST_BASENAME
        )
        if not path:
            return
        p = Path(path)
        try:
            self.model.load(p)
        except Exception as e:
            messagebox.showerror(APP_NAME, f"読み込みに失敗しました。\n{e}")
            return
        self.path_var.set(str(p))
        cfg = load_config(); cfg["manifest_path"] = str(p); save_config(cfg)
        self.refresh_tree(select_first=True)
        self.set_status("読み込みました。")

    def on_new(self):
        if not self.confirm_discard_or_apply():
            return
        self.model = ManifestModel()
        self.path_var.set("（未保存）")
        cfg = load_config(); cfg["manifest_path"] = ""; save_config(cfg)
        self.refresh_tree(select_first=False)
        self.set_status("新規マニフェストを作成しました。")

    def on_save(self):
        if not self.apply_form_to_selected(silent=True):
            return
        self.model.bump_and_stamp()
        if not self.model.path:
            path = filedialog.asksaveasfilename(
                title="保存先を選択",
                defaultextension=".json",
                initialfile=DEFAULT_MANIFEST_BASENAME,
                filetypes=[("JSON files","*.json")]
            )
            if not path:
                return
            self.model.set_path(Path(path))
            self.path_var.set(path)
            cfg = load_config(); cfg["manifest_path"] = path; save_config(cfg)
        try:
            self.model.save()
            self.set_status(f"保存しました: {self.model.data['manifestVersion']} / {self.model.data['updatedAt']}")
        except Exception as e:
            messagebox.showerror(APP_NAME, f"保存に失敗しました。\n{e}")

    def refresh_tree(self, select_first=False):
        self.tree.delete(*self.tree.get_children())
        for idx, w in enumerate(self.model.wallpapers()):
            tags = ", ".join(w.get("tags", []))
            nsfw = "yes" if w.get("nsfw") else ""
            level = w.get("requiredLevel", 0)
            self.tree.insert("", "end", iid=str(idx), values=(w.get("id",""), w.get("title",""), nsfw, level, tags))
        if self.model.wallpapers():
            iid = "0" if select_first else (self._last_selected_iid or "0")
            try:
                self.tree.selection_set(iid)
            except Exception:
                self.tree.selection_set("0")
            self._last_selected_iid = self.tree.selection()[0]
            self.load_form_from_selected()
        else:
            self.form.set_from({
                "id":"", "title":"", "nsfw":False, "tags":[], "requiredLevel":0,
                "style": {"backgroundPosition":"center center","backgroundSize":"cover","backgroundRepeat":"no-repeat","opacity":1.0},
                "sources":[]
            })

    def on_select_tree(self, _evt):
        new_sel = self.tree.selection()
        if not new_sel:
            return
        new_iid = new_sel[0]
        if self._last_selected_iid == new_iid:
            return
        if not self.confirm_discard_or_apply():
            if self._last_selected_iid is not None:
                try:
                    self.tree.selection_set(self._last_selected_iid)
                except Exception:
                    pass
            return
        self._last_selected_iid = new_iid
        self.load_form_from_selected()

    def load_form_from_selected(self):
        sel = self.tree.selection()
        if not sel:
            return
        idx = int(sel[0])
        ws = self.model.wallpapers()
        if 0 <= idx < len(ws):
            self.form.set_from(copy.deepcopy(ws[idx]))

    def add_wallpaper(self):
        if not self.confirm_discard_or_apply():
            return
        ws = self.model.wallpapers()
        base = "wallpaper"
        i = 1
        existing_ids = {w.get("id","") for w in ws}
        new_id = f"{base}-{i}"
        while new_id in existing_ids:
            i += 1
            new_id = f"{base}-{i}"
        ws.append({
            "id": new_id,
            "title": new_id,
            "sources": [],
            "style": {
                "backgroundPosition": "center center",
                "backgroundSize": "cover",
                "backgroundRepeat": "no-repeat",
                "opacity": 1.0
            },
            "nsfw": False,
            "tags": [],
            "requiredLevel": 0
        })
        self.refresh_tree(select_first=False)
        new_iid = str(len(ws)-1)
        self.tree.selection_set(new_iid)
        self._last_selected_iid = new_iid
        self.load_form_from_selected()

    def dup_wallpaper(self):
        if not self.confirm_discard_or_apply():
            return
        sel = self.tree.selection()
        if not sel:
            return
        idx = int(sel[0])
        ws = self.model.wallpapers()
        if not (0 <= idx < len(ws)):
            return
        src = copy.deepcopy(ws[idx])
        base = src.get("id","item") + "-copy"
        candidate = base
        taken = {w.get("id","") for w in ws}
        c = 1
        while candidate in taken:
            c += 1
            candidate = f"{base}-{c}"
        src["id"] = candidate
        ws.insert(idx+1, src)
        self.refresh_tree(select_first=False)
        new_iid = str(idx+1)
        self.tree.selection_set(new_iid)
        self._last_selected_iid = new_iid
        self.load_form_from_selected()

    def del_wallpaper(self):
        sel = self.tree.selection()
        if not sel:
            return
        idx = int(sel[0])
        ws = self.model.wallpapers()
        if not (0 <= idx < len(ws)):
            return
        if not messagebox.askyesno(APP_NAME, "選択した壁紙を削除しますか？"):
            return
        ws.pop(idx)
        self.refresh_tree(select_first=True)
        self._last_selected_iid = self.tree.selection()[0] if self.tree.selection() else None

    def apply_form_to_selected(self, silent=False):
        sel = self.tree.selection()
        if not sel:
            return True
        idx = int(sel[0])
        ws = self.model.wallpapers()
        if not (0 <= idx < len(ws)):
            return True
        if not self.form.is_dirty():
            return True
        try:
            w = self.form.to_dict()
        except Exception as e:
            if not silent:
                messagebox.showerror(APP_NAME, f"入力エラー: {e}")
            return False
        if not self.model.ensure_unique_id(w["id"], skip_index=idx):
            if not silent:
                messagebox.showerror(APP_NAME, f"id '{w['id']}' は既に存在します。別の id を指定してください。")
            return False
        ws[idx] = w
        self.tree.item(str(idx), values=(w.get("id",""), w.get("title",""), "yes" if w.get("nsfw") else "", w.get("requiredLevel",0), ", ".join(w.get("tags",[]))))
        self.form.reset_dirty()
        if not silent:
            self.set_status("フォーム内容を反映しました。")
        return True

    def confirm_discard_or_apply(self):
        if not self.form.is_dirty():
            return True
        ans = messagebox.askyesnocancel(APP_NAME, "編集内容が未保存です。反映しますか？\nはい: 反映 / いいえ: 破棄 / キャンセル: 中止")
        if ans is None:
            return False
        if ans:
            return self.apply_form_to_selected()
        self.form.reset_dirty()
        return True

# -------------------------------------------------------------------------------
# === ENTRYPOINT ==================================================================================
def main():
    app = App()
    app.mainloop()

if __name__ == "__main__":
    main()
