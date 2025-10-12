
from pathlib import Path
from datetime import datetime, timezone
import json
import copy
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

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
        self.bind_shortcuts()
        self.refresh_tree(select_first=True)

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

def main():
    app = App()
    app.mainloop()

if __name__ == "__main__":
    main()
