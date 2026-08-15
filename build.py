#!/usr/bin/env python3
"""Build index.html from posture.md — dark theme, mobile-first, no external deps."""
import markdown, pathlib

base = pathlib.Path(__file__).parent
md = (base / "posture.md").read_text()
body = markdown.markdown(md, extensions=["extra", "tables", "fenced_code"])

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Home Server Agent Infrastructure — Security Posture</title>
<style>
:root { --bg:#0d1117; --card:#161b22; --border:#30363d; --txt:#e6edf3; --mut:#8b949e; --acc:#58a6ff; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--txt); font:15px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.wrap { max-width:820px; margin:0 auto; padding:0 18px 60px; }
header { border-bottom:1px solid var(--border); margin-bottom:26px; padding:26px 0 16px; }
h1 { font-size:24px; margin:0 0 6px; }
h2 { font-size:17px; margin:30px 0 10px; padding-bottom:6px; border-bottom:1px solid var(--border); text-transform:uppercase; letter-spacing:.05em; color:var(--mut); }
blockquote { margin:14px 0; padding:10px 14px; background:var(--card); border-left:3px solid var(--acc); border-radius:0 8px 8px 0; color:#c9d1d9; }
table { border-collapse:collapse; width:100%; margin:12px 0; font-size:13.5px; background:var(--card); border:1px solid var(--border); border-radius:8px; overflow:hidden; }
th,td { border:1px solid var(--border); padding:7px 10px; text-align:left; vertical-align:top; }
th { background:var(--border); font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--mut); }
a { color:var(--acc); }
code { background:var(--card); border:1px solid var(--border); padding:1px 5px; border-radius:4px; font-size:13px; }
ul,ol { padding-left:22px; }
li { margin:4px 0; }
input[type=checkbox] { accent-color:var(--acc); }
.foot { margin-top:40px; padding-top:14px; border-top:1px solid var(--border); color:var(--mut); font-size:12px; text-align:center; }
@media (max-width:600px) { h1 { font-size:20px; } table { font-size:12.5px; } th,td { padding:5px 7px; } }
@media print { body { background:#fff; color:#000; } table { background:#f6f8fa; } }
</style>
</head>
<body>
<div class="wrap">
<header><h1>Home Server Agent Infrastructure</h1><p style="color:var(--mut);margin:0">Security posture, accepted risks &amp; roadmap — public (sanitized) version</p></header>
__BODY__
<div class="foot">Living document · reviewed 2026-08-15 · internal OPSEC details kept private · <a href="https://github.com/bhanuharya/security-posture">source repo</a></div>
</div>
</body>
</html>"""

html = TEMPLATE.replace("__BODY__", body)
(base / "index.html").write_text(html)
print(f"index.html written: {len(html)//1024} KB, tables={body.count('<table>')}")
