
from pathlib import Path
from datetime import datetime, timezone
import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

APP_NAME = "Manifest GUI"
CONFIG_PATH = Path.home() / ".kb_manifest_gui.json"
DEFAULT_MANIFEST_BASENAME = "wallpapers.manifest.json"

def load_config():
    if CONFIG_PATH.exists():
        try:
            return json.load(open(CONFIG_PATH, "r", encoding="utf-8"))
        except Exception:
            return {}
    return {}

def save_config(cfg):
    try:
        CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

def semver_bump_patch(ver: str) -> str:
    try:
        parts = ver.split(".")
        while len(parts) < 3:
            parts.append("0")
        major, minor, patch = parts[:3]
        return f"{int(major)}.{int(minor)}.{int(patch)+1}"
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

class SourcesEditor(ttk.Frame):
    def __init__(self, master):
        super().__init__(master)
        self.rows = []
        header = ttk.Frame(self)
        header.grid(column=0, row=0, sticky="ew", pady=(0,4))
        for i, text in enumerate(["provider", "id (URL or key)", "mediaType", ""]):
            ttk.Label(header, text=text).grid(column=i, row=0, padx=4)
        self.body = ttk.Frame(self)
        self.body.grid(column=0, row=1, sticky="nsew")
        self.add_btn = ttk.Button(self, text="+ 画像ソースを追加", command=self.add_row)
        self.add_btn.grid(column=0, row=2, sticky="w", pady=8)
        self.columnconfigure(0, weight=1)

    def add_row(self, prefill=None):
        i = len(self.rows)
        frame = ttk.Frame(self.body)
        frame.grid(column=0, row=i, sticky="ew", pady=2)
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
                break

    def get_value(self):
        out = []
        for (_f, e_p, e_id, e_t) in self.rows:
            provider = e_p.get().strip()
            sid = e_id.get().strip()
            mtype = e_t.get().strip()
            if provider and sid and mtype:
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
        self.var_id = tk.StringVar()
        self.var_title = tk.StringVar()
        self.var_nsfw = tk.BooleanVar(value=False)
        self.var_tags = tk.StringVar()
        self.var_required = tk.StringVar(value="0")

        self.var_pos = tk.StringVar(value="center center")
        self.var_size = tk.StringVar(value="cover")
        self.var_repeat = tk.StringVar(value="no-repeat")
        self.var_opacity = tk.StringVar(value="1.0")

        r = 0
        ttk.Label(self, text="id").grid(column=0, row=r, sticky="e", padx=6, pady=2); 
        ttk.Entry(self, textvariable=self.var_id, width=28).grid(column=1, row=r, sticky="w", padx=6)
        r+=1
        ttk.Label(self, text="title").grid(column=0, row=r, sticky="e", padx=6, pady=2); 
        ttk.Entry(self, textvariable=self.var_title, width=28).grid(column=1, row=r, sticky="w", padx=6)
        r+=1
        ttk.Label(self, text="tags（カンマ区切り）").grid(column=0, row=r, sticky="e", padx=6, pady=2); 
        ttk.Entry(self, textvariable=self.var_tags, width=28).grid(column=1, row=r, sticky="w", padx=6)
        r+=1
        ttk.Label(self, text="requiredLevel").grid(column=0, row=r, sticky="e", padx=6, pady=2); 
        ttk.Entry(self, textvariable=self.var_required, width=10).grid(column=1, row=r, sticky="w", padx=6)
        r+=1
        ttk.Label(self, text="nsfw").grid(column=0, row=r, sticky="e", padx=6, pady=2); 
        ttk.Checkbutton(self, variable=self.var_nsfw).grid(column=1, row=r, sticky="w", padx=6)
        r+=1

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
        ttk.Label(self, text="sources").grid(column=0, row=r, sticky="ne", padx=6, pady=2)
        self.sources = SourcesEditor(self)
        self.sources.grid(column=1, row=r, sticky="ew", padx=6); r+=1

        for c in range(0, 2):
            self.columnconfigure(c, weight=1)

    def to_dict(self):
        try:
            opacity = float(self.var_opacity.get().strip())
        except ValueError:
            opacity = 1.0
        try:
            required = int(self.var_required.get().strip())
        except ValueError:
            required = 0

        tags = [t.strip() for t in self.var_tags.get().split(",") if t.strip()]
        w = {
            "id": self.var_id.get().strip(),
            "title": self.var_title.get().strip() or self.var_id.get().strip(),
            "sources": self.sources.get_value(),
            "style": {
                "backgroundPosition": self.var_pos.get().strip() or "center center",
                "backgroundSize": self.var_size.get().strip() or "cover",
                "backgroundRepeat": self.var_repeat.get().strip() or "no-repeat",
                "opacity": max(0.0, min(1.0, opacity)),
            },
            "nsfw": bool(self.var_nsfw.get()),
            "tags": tags,
            "requiredLevel": required
        }
        return w

    def set_from(self, w):
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

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_NAME)
        self.geometry("980x640")
        self.minsize(900, 560)
        self.cfg = load_config()
        self.manifest_path = Path(self.cfg.get("manifest_path", "")) if self.cfg.get("manifest_path") else None
        self.manifest = None

        self.create_widgets()
        if self.manifest_path and self.manifest_path.exists():
            self.load_manifest(self.manifest_path)

    def create_widgets(self):
        toolbar = ttk.Frame(self)
        toolbar.pack(side="top", fill="x")

        self.path_var = tk.StringVar(value=str(self.manifest_path) if self.manifest_path else "")
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
        for col, w in [("id", 160), ("title", 200), ("nsfw", 60), ("level", 80), ("tags", 240)]:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=w, anchor="w")
        self.tree.pack(side="top", fill="both", expand=True, padx=6, pady=(0,6))

        btns = ttk.Frame(left)
        ttk.Button(btns, text="+ 追加", command=self.add_wallpaper).pack(side="left", padx=4)
        ttk.Button(btns, text="複製", command=self.dup_wallpaper).pack(side="left", padx=4)
        ttk.Button(btns, text="削除", command=self.del_wallpaper).pack(side="left", padx=4)
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

    def set_status(self, text):
        self.status_var.set(text)
        self.after(4000, lambda: self.status_var.set(""))

    def on_open(self):
        path = filedialog.askopenfilename(
            title="マニフェストを選択",
            filetypes=[("JSON files","*.json"), ("All files","*.*")],
            initialfile=DEFAULT_MANIFEST_BASENAME
        )
        if not path:
            return
        p = Path(path)
        if not p.exists():
            messagebox.showerror(APP_NAME, "選択したファイルが存在しません。")
            return
        self.load_manifest(p)

    def on_new(self):
        self.manifest = default_manifest()
        self.manifest_path = None
        self.path_var.set("（未保存）")
        self.refresh_tree()
        self.set_status("新規マニフェストを作成しました。")

    def on_save(self):
        if not self.manifest:
            messagebox.showwarning(APP_NAME, "保存する内容がありません。")
            return
        ver = self.manifest.get("manifestVersion", "1.0.0")
        self.manifest["manifestVersion"] = semver_bump_patch(ver)
        self.manifest["updatedAt"] = now_iso()

        if not self.manifest_path:
            path = filedialog.asksaveasfilename(
                title="保存先を選択",
                defaultextension=".json",
                initialfile=DEFAULT_MANIFEST_BASENAME,
                filetypes=[("JSON files","*.json")]
            )
            if not path:
                return
            self.manifest_path = Path(path)
        try:
            text = json.dumps(self.manifest, ensure_ascii=False, indent=2)
            self.manifest_path.write_text(text, encoding="utf-8")
            self.path_var.set(str(self.manifest_path))
            cfg = load_config()
            cfg["manifest_path"] = str(self.manifest_path)
            save_config(cfg)
            self.set_status(f"保存しました: {self.manifest['manifestVersion']} / {self.manifest['updatedAt']}")
        except Exception as e:
            messagebox.showerror(APP_NAME, f"保存に失敗しました。\n{e}")

    def load_manifest(self, path: Path):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            messagebox.showerror(APP_NAME, f"読み込みに失敗しました。\n{e}")
            return
        data.setdefault("wallpapers", [])
        data.setdefault("defaults", {"style":{}})
        self.manifest = data
        self.manifest_path = path
        self.path_var.set(str(path))
        cfg = load_config()
        cfg["manifest_path"] = str(path)
        save_config(cfg)
        self.refresh_tree()
        self.set_status("読み込みました。")

    def refresh_tree(self):
        for i in self.tree.get_children():
            self.tree.delete(i)
        if not self.manifest:
            return
        for idx, w in enumerate(self.manifest.get("wallpapers", [])):
            tags = ", ".join(w.get("tags", []))
            nsfw = "yes" if w.get("nsfw") else ""
            level = w.get("requiredLevel", 0)
            self.tree.insert("", "end", iid=str(idx), values=(w.get("id",""), w.get("title",""), nsfw, level, tags))
        if self.manifest.get("wallpapers"):
            self.tree.selection_set("0")
            self.load_form_from_selected()

    def add_wallpaper(self):
        if not self.manifest:
            self.manifest = default_manifest()
        ws = self.manifest.setdefault("wallpapers", [])
        new_id = f"wallpaper-{len(ws)+1}"
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
        self.refresh_tree()
        self.tree.selection_set(str(len(ws)-1))
        self.load_form_from_selected()

    def dup_wallpaper(self):
        sel = self.tree.selection()
        if not sel:
            return
        idx = int(sel[0])
        ws = self.manifest["wallpapers"]
        src = json.loads(json.dumps(ws[idx], ensure_ascii=False))
        src["id"] = f"{src.get('id','item')}-copy"
        ws.insert(idx+1, src)
        self.refresh_tree()
        self.tree.selection_set(str(idx+1))
        self.load_form_from_selected()

    def del_wallpaper(self):
        sel = self.tree.selection()
        if not sel:
            return
        idx = int(sel[0])
        if messagebox.askyesno(APP_NAME, "選択した壁紙を削除しますか？"):
            ws = self.manifest["wallpapers"]
            if 0 <= idx < len(ws):
                ws.pop(idx)
                self.refresh_tree()

    def on_select_tree(self, _evt):
        self.load_form_from_selected()

    def load_form_from_selected(self):
        sel = self.tree.selection()
        if not sel or not self.manifest:
            return
        idx = int(sel[0])
        ws = self.manifest.get("wallpapers", [])
        if 0 <= idx < len(ws):
            self.form.set_from(ws[idx])

    def apply_form_to_selected(self):
        if not self.manifest:
            return
        sel = self.tree.selection()
        if not sel:
            return
        idx = int(sel[0])
        ws = self.manifest.get("wallpapers", [])
        if not (0 <= idx < len(ws)):
            return
        w = self.form.to_dict()
        if not w["id"]:
            messagebox.showwarning(APP_NAME, "id は必須です。")
            return
        if not w["sources"]:
            if not messagebox.askyesno(APP_NAME, "sources が空です。このまま反映しますか？"):
                return
        ws[idx] = w
        self.refresh_tree()
        self.tree.selection_set(str(idx))
        self.set_status("フォーム内容を反映しました。")

def main():
    app = App()
    app.mainloop()

if __name__ == "__main__":
    main()
