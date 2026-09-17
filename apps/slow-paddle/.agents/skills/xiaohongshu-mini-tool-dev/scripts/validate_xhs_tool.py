#!/usr/bin/env python3
"""Static compatibility validator for Xiaohongshu mini-tool packages."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import unquote, urlsplit

ALLOWED_EXTENSIONS = {
    ".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".svg", ".woff", ".woff2", ".json",
}
TEXT_EXTENSIONS = {".html", ".css", ".js", ".svg", ".json"}
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", ".cache"}
EXTERNAL_URL_RE = re.compile(
    r"(?i)(?:https?://[^\s'\"<>)}]+|//(?:[a-z0-9-]+\.)*[a-z0-9-]+[^\s'\"<>)}]*)"
)
DATA_OR_BLOB_RE = re.compile(r"(?i)^(?:data|blob):")
LINE_EVENT_RE = re.compile(r"(?i)^on[a-z]+$")
CSS_URL_RE = re.compile(r"(?is)url\(\s*(['\"]?)(.*?)\1\s*\)")
CSS_IMPORT_RE = re.compile(
    r"(?im)@import\s+(?:url\(\s*)?(['\"]?)([^'\"\s);]+)\1\s*\)?"
)
NONNETWORK_NAMESPACE_URLS = {
    "http://www.w3.org/1999/xhtml",
    "http://www.w3.org/1999/xlink",
    "http://www.w3.org/2000/svg",
}


@dataclass(order=True)
class Finding:
    severity: str
    code: str
    path: str
    line: int
    message: str


@dataclass
class ScriptContext:
    line: int
    has_src: bool
    chunks: list[str]


@dataclass
class StyleContext:
    line: int
    chunks: list[str]


class Collector:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.findings: list[Finding] = []
        self._seen: set[tuple[str, str, str, int, str]] = set()

    def add(self, severity: str, code: str, path: Path, line: int, message: str) -> None:
        try:
            display = str(path.relative_to(self.root))
        except ValueError:
            display = str(path)
        item = Finding(severity, code, display, max(1, line), message)
        key = (item.severity, item.code, item.path, item.line, item.message)
        if key not in self._seen:
            self._seen.add(key)
            self.findings.append(item)


def line_for_offset(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def check_local_reference(
    value: str,
    source: Path,
    collector: Collector,
    line: int,
    context: str,
) -> None:
    parsed = urlsplit(value)
    if parsed.scheme:
        collector.add(
            "ERROR", "NONLOCAL_RESOURCE_SCHEME", source, line,
            f"{context} 使用了非本地 URL scheme：{parsed.scheme}:。",
        )
        return
    if parsed.netloc:
        collector.add(
            "ERROR", "EXTERNAL_RESOURCE", source, line,
            f"{context} 指向外部主机：//{parsed.netloc}。",
        )
        return
    if not parsed.path:
        collector.add(
            "ERROR", "EMPTY_RESOURCE_PATH", source, line,
            f"{context} 没有可打包的本地资源路径：{value}",
        )
        return
    if parsed.path.startswith("/"):
        collector.add(
            "ERROR", "ABSOLUTE_RESOURCE_PATH", source, line,
            f"{context} 必须使用包内相对路径，不能使用根路径：{value}",
        )
        return

    target = (source.parent / unquote(parsed.path)).resolve()
    try:
        target.relative_to(collector.root.resolve())
    except ValueError:
        collector.add(
            "ERROR", "RESOURCE_OUTSIDE_ROOT", source, line,
            f"{context} 解析到项目目录之外：{value}",
        )
        return

    if not target.is_file():
        collector.add(
            "ERROR", "MISSING_LOCAL_RESOURCE", source, line,
            f"本地资源不存在：{value}",
        )


def scan_css_references(
    path: Path,
    text: str,
    collector: Collector,
    base_line: int = 1,
) -> None:
    for match in CSS_IMPORT_RE.finditer(text):
        value = match.group(2).strip()
        line = base_line + line_for_offset(text, match.start(2)) - 1
        if DATA_OR_BLOB_RE.match(value):
            collector.add(
                "ERROR", "CSS_IMPORT_DATA_BLOB", path, line,
                "@import 不应使用 data:/blob:；将样式保存为包内 .css 文件。",
            )
        else:
            check_local_reference(value, path, collector, line, "CSS @import")

    for match in CSS_URL_RE.finditer(text):
        value = match.group(2).strip()
        line = base_line + line_for_offset(text, match.start(2)) - 1
        if not value or value.startswith("#"):
            continue
        if DATA_OR_BLOB_RE.match(value):
            collector.add(
                "WARNING", "CSS_DATA_BLOB_VERSION", path, line,
                "data:/blob: 图片存在 9.37 之前版本兼容性；确认是否需要 Canvas 替代方案。",
            )
            continue
        check_local_reference(value, path, collector, line, "CSS url()")


class XHSHtmlParser(HTMLParser):
    def __init__(self, path: Path, collector: Collector) -> None:
        super().__init__(convert_charrefs=True)
        self.path = path
        self.collector = collector
        self.script_stack: list[ScriptContext] = []
        self.style_stack: list[StyleContext] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._handle_tag(tag.lower(), attrs)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._handle_tag(tag.lower(), attrs)

    def handle_endtag(self, tag: str) -> None:
        low = tag.lower()
        if low == "script" and self.script_stack:
            context = self.script_stack.pop()
            if "".join(context.chunks).strip():
                self.collector.add(
                    "ERROR", "INLINE_SCRIPT", self.path, context.line,
                    "禁止内联 <script>；将代码移入包内 .js 文件并通过 src 引入。",
                )
        if low == "style" and self.style_stack:
            context = self.style_stack.pop()
            scan_css_references(
                self.path, "".join(context.chunks), self.collector, context.line,
            )

    def handle_data(self, data: str) -> None:
        if self.script_stack:
            self.script_stack[-1].chunks.append(data)
        elif self.style_stack:
            self.style_stack[-1].chunks.append(data)

    def finalize(self) -> None:
        while self.script_stack:
            context = self.script_stack.pop()
            if "".join(context.chunks).strip():
                self.collector.add(
                    "ERROR", "INLINE_SCRIPT", self.path, context.line,
                    "禁止内联 <script>；将代码移入包内 .js 文件并通过 src 引入。",
                )
            self.collector.add(
                "ERROR", "UNCLOSED_SCRIPT_TAG", self.path, context.line,
                "检测到未闭合的 <script> 标签。",
            )
        while self.style_stack:
            context = self.style_stack.pop()
            scan_css_references(
                self.path, "".join(context.chunks), self.collector, context.line,
            )
            self.collector.add(
                "ERROR", "UNCLOSED_STYLE_TAG", self.path, context.line,
                "检测到未闭合的 <style> 标签。",
            )

    def _handle_tag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        line, _ = self.getpos()
        amap = {str(k).lower(): (v or "") for k, v in attrs}

        for name in amap:
            if LINE_EVENT_RE.match(name):
                self.collector.add(
                    "ERROR", "INLINE_EVENT", self.path, line,
                    f"禁止行内事件属性 {name}=；改用 addEventListener。",
                )

        if tag == "base":
            self.collector.add(
                "ERROR", "BASE_URL", self.path, line,
                "禁止 <base>；它会改变包内相对路径的解析语义。",
            )

        if tag == "meta" and amap.get("http-equiv", "").strip().lower() == "refresh":
            self.collector.add(
                "ERROR", "META_REFRESH", self.path, line,
                "禁止 meta refresh 页面跳转。",
            )

        if tag == "script":
            src = amap.get("src", "").strip()
            self.script_stack.append(ScriptContext(line, bool(src), []))
            if src:
                self._check_resource_url(src, tag, "src", line)
            else:
                self.collector.add(
                    "ERROR", "INLINE_SCRIPT", self.path, line,
                    "禁止内联 <script>；将代码移入包内 .js 文件并通过 src 引入。",
                )

        if tag == "style":
            self.style_stack.append(StyleContext(line, []))

        if tag in {"iframe", "object", "embed", "applet"}:
            self.collector.add(
                "ERROR", "EMBEDDED_CONTENT", self.path, line,
                f"容器禁止 <{tag}> 嵌入内容。",
            )

        if tag == "link" and "manifest" in {
            value.strip().lower() for value in amap.get("rel", "").split()
        }:
            self.collector.add(
                "ERROR", "PWA_MANIFEST", self.path, line,
                "移动端容器不支持 PWA 安装；不要引用 Web App Manifest。",
            )

        if tag in {"a", "area"}:
            if "download" in amap:
                self.collector.add(
                    "ERROR", "FILE_DOWNLOAD", self.path, line,
                    "容器禁止 a[download] 和浏览器文件下载。",
                )
            if amap.get("target", "").lower() == "_blank":
                self.collector.add(
                    "ERROR", "NEW_WINDOW", self.path, line,
                    "容器禁止 target=\"_blank\" 和新窗口。",
                )

        if tag == "form":
            action = amap.get("action", "").strip()
            if action and action != "#":
                self.collector.add(
                    "ERROR", "FORM_NAVIGATION", self.path, line,
                    "容器禁止 <form> 提交跳转；改为本地事件处理并 preventDefault。",
                )
            else:
                self.collector.add(
                    "WARNING", "FORM_REVIEW", self.path, line,
                    "确认表单提交事件始终 preventDefault，且不会触发页面跳转。",
                )

        if "formaction" in amap and amap["formaction"].strip():
            self.collector.add(
                "ERROR", "FORM_NAVIGATION", self.path, line,
                "容器禁止 formaction 提交跳转。",
            )

        if tag == "input" and amap.get("type", "").lower() == "file":
            accept = amap.get("accept", "").strip()
            if accept:
                invalid = [
                    value.strip() for value in accept.split(",")
                    if value.strip() and not self._media_accept(value.strip())
                ]
                if invalid:
                    self.collector.add(
                        "WARNING", "FILE_ACCEPT_LIMIT", self.path, line,
                        "文件选择器只开放图片和视频；以下 accept 值不会扩大范围："
                        + ", ".join(invalid),
                    )

        for attr in ("src", "srcset", "href", "poster", "action", "formaction"):
            if attr in amap and not (tag == "script" and attr == "src"):
                self._check_resource_url(amap[attr].strip(), tag, attr, line)

        if "style" in amap:
            scan_css_references(self.path, amap["style"], self.collector, line)

    @staticmethod
    def _media_accept(value: str) -> bool:
        value = value.lower()
        if value in {"image/*", "video/*"}:
            return True
        return value in {
            ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
            ".mp4", ".mov", ".m4v", ".webm",
        }

    def _check_resource_url(self, value: str, tag: str, attr: str, line: int) -> None:
        if not value or value.startswith("#"):
            return
        low = value.lower()
        if low.startswith("javascript:"):
            self.collector.add(
                "ERROR", "JAVASCRIPT_URI", self.path, line,
                f"禁止 {attr}=\"javascript:…\"。",
            )
            return
        if tag in {"a", "area"} and attr == "href":
            self.collector.add(
                "ERROR", "LINK_NAVIGATION", self.path, line,
                f"容器禁止链接导航：href=\"{value}\"。使用单页状态切换。",
            )
            return
        if attr in {"action", "formaction"}:
            return
        if DATA_OR_BLOB_RE.match(value):
            if tag in {"img", "source"} and attr in {"src", "srcset"}:
                self.collector.add(
                    "WARNING", "IMAGE_DATA_BLOB_VERSION", self.path, line,
                    "data:/blob: 图片自 9.37 起支持；决定是否需要旧版 Canvas 兼容方案。",
                )
            else:
                self.collector.add(
                    "ERROR", "DISALLOWED_DATA_BLOB", self.path, line,
                    f"{tag} 的 {attr} 不允许使用 data:/blob: 资源。",
                )
            return

        candidates = [value]
        if attr == "srcset":
            candidates = [
                part.strip().split()[0]
                for part in value.split(",") if part.strip()
            ]
        for candidate in candidates:
            if "{" in candidate or "}" in candidate:
                self.collector.add(
                    "WARNING", "DYNAMIC_RESOURCE_PATH", self.path, line,
                    f"无法静态确认动态资源路径：{candidate}",
                )
                continue
            check_local_reference(
                candidate, self.path, self.collector, line,
                f"<{tag}> {attr}",
            )


CODE_PATTERNS: list[tuple[str, str, str, re.Pattern[str]]] = [
    ("ERROR", "NETWORK_FETCH", "禁止 fetch 网络请求。", re.compile(r"\bfetch\s*\(")),
    ("ERROR", "NETWORK_XHR", "禁止 XMLHttpRequest 网络请求。", re.compile(r"\bXMLHttpRequest\b")),
    ("ERROR", "NETWORK_WEBSOCKET", "禁止 WebSocket。", re.compile(r"\bWebSocket\b")),
    ("ERROR", "NETWORK_SSE", "禁止 EventSource / SSE。", re.compile(r"\bEventSource\b")),
    ("ERROR", "NETWORK_WEBRTC", "禁止 WebRTC。", re.compile(r"\b(?:RTCPeerConnection|RTCDataChannel)\b")),
    ("ERROR", "NETWORK_BEACON", "禁止 sendBeacon 网络请求。", re.compile(r"\bnavigator\s*\.\s*sendBeacon\s*\(")),
    ("ERROR", "NETWORK_WEBTRANSPORT", "禁止 WebTransport。", re.compile(r"\bWebTransport\s*\(")),
    ("ERROR", "DYNAMIC_EVAL", "禁止 eval 动态执行代码。", re.compile(r"(?<![\w$.])eval\s*\(")),
    ("ERROR", "DYNAMIC_FUNCTION", "禁止 new Function 动态执行代码。", re.compile(r"\bnew\s+Function\s*\(")),
    ("ERROR", "WASM", "禁止 WebAssembly；依赖 WASM 的库无法运行。", re.compile(r"\bWebAssembly\b|\.wasm\b", re.I)),
    ("ERROR", "WORKER", "禁止 Worker / SharedWorker。", re.compile(r"\b(?:new\s+)?(?:SharedWorker|Worker)\s*\(")),
    ("ERROR", "SERVICE_WORKER", "禁止 Service Worker。", re.compile(r"\bserviceWorker\b")),
    ("ERROR", "SHARED_ARRAY_BUFFER", "禁止 SharedArrayBuffer 多线程。", re.compile(r"\bSharedArrayBuffer\b")),
    ("ERROR", "GEOLOCATION", "禁止地理定位。", re.compile(r"\b(?:navigator\s*\.\s*)?geolocation\b")),
    ("ERROR", "CLIPBOARD", "禁止剪贴板 API。", re.compile(r"\bnavigator\s*\.\s*clipboard\b|execCommand\s*\(\s*['\"](?:copy|cut|paste)['\"]")),
    ("ERROR", "HARDWARE_API", "禁止蓝牙、USB、HID 或串口 API。", re.compile(r"\bnavigator\s*\.\s*(?:bluetooth|usb|hid|serial)\b")),
    ("ERROR", "SENSOR_API", "禁止传感器和设备运动／朝向 API。", re.compile(r"\b(?:Accelerometer|Gyroscope|Magnetometer|AmbientLightSensor|DeviceMotionEvent|DeviceOrientationEvent)\b")),
    ("ERROR", "SCREEN_API", "禁止屏幕共享或 requestFullscreen。", re.compile(r"\b(?:getDisplayMedia|requestFullscreen)\b")),
    ("ERROR", "DEVICE_INFO", "禁止电池、网络信息或媒体设备枚举。", re.compile(r"\b(?:getBattery|enumerateDevices)\s*\(|navigator\s*\.\s*connection\b")),
    ("ERROR", "PERSISTENT_STORAGE", "禁止请求持久化存储或跨域存储访问。", re.compile(r"\bnavigator\s*\.\s*storage\s*\.\s*(?:persist|persisted|getDirectory)\s*\(|\bdocument\s*\.\s*requestStorageAccess\s*\(")),
    ("ERROR", "FILE_SYSTEM_ACCESS", "禁止文件系统访问 API。", re.compile(r"\b(?:showOpenFilePicker|showSaveFilePicker|showDirectoryPicker)\s*\(|\bFileSystem(?:File|Directory)?Handle\b")),
    ("ERROR", "CREDENTIALS", "禁止 WebAuthn / navigator.credentials / Web Locks。", re.compile(r"\b(?:PublicKeyCredential|navigator\s*\.\s*credentials|navigator\s*\.\s*locks)\b")),
    ("ERROR", "WINDOW_OPEN", "禁止 window.open 新窗口。", re.compile(r"\bwindow\s*\.\s*open\s*\(")),
    ("ERROR", "WINDOW_PROMPT", "禁止 window.prompt。", re.compile(r"\b(?:window\s*\.\s*)?prompt\s*\(")),
    ("ERROR", "PAYMENT_REQUEST", "移动端容器不支持 PaymentRequest。", re.compile(r"\bPaymentRequest\b")),
    ("ERROR", "NOTIFICATION_API", "移动端容器不支持系统通知／推送。", re.compile(r"\bNotification\b|\bPushManager\b")),
    ("ERROR", "NFC_API", "移动端容器不支持 NFC。", re.compile(r"\bNDEFReader\b")),
    ("ERROR", "MIDI_API", "移动端容器不支持 MIDI。", re.compile(r"\brequestMIDIAccess\b")),
    ("ERROR", "XR_API", "移动端容器不支持 XR / AR / VR。", re.compile(r"\bnavigator\s*\.\s*xr\b|\bXRSession\b")),
    ("ERROR", "BACKGROUND_SYNC", "移动端容器不支持后台同步。", re.compile(r"\b(?:SyncManager|PeriodicSyncManager)\b")),
    ("ERROR", "POINTER_KEYBOARD_LOCK", "移动端容器不支持指针或键盘锁定。", re.compile(r"\brequestPointerLock\b|\bnavigator\s*\.\s*keyboard\s*\.\s*lock\b")),
    ("ERROR", "WINDOW_MANAGEMENT", "移动端容器不支持窗口管理 API。", re.compile(r"\bgetScreenDetails\b")),
    ("ERROR", "PROGRAMMATIC_DOWNLOAD", "容器禁止程序化文件下载。", re.compile(r"\.download\s*=|setAttribute\s*\(\s*['\"]download['\"]")),
    ("WARNING", "DYNAMIC_IMPORT", "动态 import 可能产生运行时资源加载；确认目标为包内静态资源。", re.compile(r"\bimport\s*\(")),
    ("WARNING", "COOKIE_REVIEW", "Cookie 只能作为本地存储；不要用于服务端登录态或鉴权。", re.compile(r"\bdocument\s*\.\s*cookie\b")),
    ("WARNING", "NAVIGATION_REVIEW", "检测到页面导航 API；确认不会打开外链、新窗口或其他小工具。", re.compile(r"\b(?:location\s*\.\s*(?:assign|replace)|history\s*\.\s*(?:pushState|replaceState))\s*\(")),
]


def read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            return path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError:
            return None


def scan_code(path: Path, text: str, collector: Collector) -> None:
    for severity, code, message, pattern in CODE_PATTERNS:
        for match in pattern.finditer(text):
            collector.add(severity, code, path, line_for_offset(text, match.start()), message)

    for match in EXTERNAL_URL_RE.finditer(text):
        value = match.group(0)
        if value in NONNETWORK_NAMESPACE_URLS:
            continue
        collector.add(
            "ERROR", "EXTERNAL_URL", path, line_for_offset(text, match.start()),
            f"检测到外部 URL：{value}。所有资源和数据必须本地打包。",
        )

    if path.suffix.lower() == ".css":
        scan_css_references(path, text, collector)


def iter_project_files(root: Path, collector: Collector) -> Iterable[Path]:
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            collector.add(
                "ERROR", "SYMLINK", path, 1,
                "最终提交包不得包含符号链接；请复制真实文件并使用包内相对路径。",
            )
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(root).parts):
            if path.is_dir() and path.name in SKIP_DIRS:
                collector.add(
                    "WARNING", "IGNORED_DIRECTORY", path, 1,
                    f"已跳过开发目录 {path.name}；不要将其放入最终提交包。",
                )
            continue
        if path.is_file():
            yield path


def validate(root: Path) -> Collector:
    collector = Collector(root)
    files = list(iter_project_files(root, collector))
    html_files: list[Path] = []

    for path in files:
        ext = path.suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            collector.add(
                "ERROR", "UNSUPPORTED_FILE", path, 1,
                f"最终包不支持文件类型 {ext or '(无扩展名)'}。",
            )
            continue

        if ext == ".html":
            html_files.append(path)

        if ext in TEXT_EXTENSIONS:
            text = read_text(path)
            if text is None:
                collector.add("ERROR", "TEXT_DECODE", path, 1, "文本文件不是有效 UTF-8。")
                continue
            scan_code(path, text, collector)
            if ext == ".html":
                parser = XHSHtmlParser(path, collector)
                try:
                    parser.feed(text)
                    parser.close()
                    parser.finalize()
                except Exception as exc:
                    collector.add("ERROR", "HTML_PARSE", path, 1, f"HTML 解析失败：{exc}")

    if len(html_files) != 1:
        collector.add(
            "ERROR", "HTML_ENTRY_COUNT", root, 1,
            f"最终包必须且只能有一个 .html 入口；当前检测到 {len(html_files)} 个。",
        )

    collector.findings.sort(
        key=lambda item: (
            {"ERROR": 0, "WARNING": 1, "INFO": 2}.get(item.severity, 9),
            item.path,
            item.line,
            item.code,
        )
    )
    return collector


def print_text_report(root: Path, collector: Collector) -> None:
    counts = {"ERROR": 0, "WARNING": 0, "INFO": 0}
    print(f"小红书小工具兼容性检查：{root}")
    print("-" * 72)
    for item in collector.findings:
        counts[item.severity] = counts.get(item.severity, 0) + 1
        print(f"[{item.severity}] {item.code} {item.path}:{item.line} {item.message}")
    if not collector.findings:
        print("未发现静态兼容性问题。")
    print("-" * 72)
    print(f"汇总：ERROR={counts['ERROR']} WARNING={counts['WARNING']} INFO={counts['INFO']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="扫描小红书小工具项目的容器兼容性问题。")
    parser.add_argument("project", type=Path, help="项目或最终提交目录")
    parser.add_argument("--json", action="store_true", dest="as_json", help="输出 JSON")
    parser.add_argument("--strict", action="store_true", help="存在 WARNING 时也返回非零状态")
    args = parser.parse_args()

    root = args.project.expanduser().resolve()
    if not root.is_dir():
        print(f"错误：目录不存在：{root}", file=sys.stderr)
        return 2

    collector = validate(root)
    errors = sum(1 for item in collector.findings if item.severity == "ERROR")
    warnings = sum(1 for item in collector.findings if item.severity == "WARNING")

    if args.as_json:
        payload = {
            "project": str(root),
            "summary": {"errors": errors, "warnings": warnings},
            "findings": [asdict(item) for item in collector.findings],
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print_text_report(root, collector)

    if errors:
        return 1
    if args.strict and warnings:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
