import ctypes
from ctypes import wintypes

_kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
_user32 = ctypes.WinDLL("user32", use_last_error=True)
_dwmapi = ctypes.WinDLL("dwmapi")

_kernel32.CreateMutexW.restype = wintypes.HANDLE
_kernel32.CreateMutexW.argtypes = (wintypes.LPVOID, wintypes.BOOL, wintypes.LPCWSTR)
_user32.FindWindowW.restype = wintypes.HWND
_user32.FindWindowW.argtypes = (wintypes.LPCWSTR, wintypes.LPCWSTR)
_user32.MessageBoxW.argtypes = (wintypes.HWND, wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.UINT)
_user32.ShowWindow.argtypes = (wintypes.HWND, ctypes.c_int)
_user32.IsIconic.argtypes = (wintypes.HWND,)
_user32.SetForegroundWindow.argtypes = (wintypes.HWND,)
_user32.IsZoomed.argtypes = (wintypes.HWND,)
_user32.PostMessageW.argtypes = (wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)
_user32.SendMessageW.argtypes = (wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)
_user32.SetWindowPos.argtypes = (
    wintypes.HWND, wintypes.HWND, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, wintypes.UINT,
)
_user32.GetWindowLongPtrW.restype = ctypes.c_ssize_t
_user32.GetWindowLongPtrW.argtypes = (wintypes.HWND, ctypes.c_int)
_user32.SetWindowLongPtrW.restype = ctypes.c_ssize_t
_user32.SetWindowLongPtrW.argtypes = (wintypes.HWND, ctypes.c_int, ctypes.c_ssize_t)
_user32.CallWindowProcW.restype = ctypes.c_ssize_t
_user32.CallWindowProcW.argtypes = (ctypes.c_void_p, wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)

_user32.GetDpiForWindow.argtypes = (wintypes.HWND,)
_user32.GetSystemMetricsForDpi.argtypes = (ctypes.c_int, wintypes.UINT)
_user32.MonitorFromWindow.restype = wintypes.HANDLE
_user32.MonitorFromWindow.argtypes = (wintypes.HWND, wintypes.DWORD)
_user32.GetMonitorInfoW.argtypes = (wintypes.HANDLE, ctypes.c_void_p)


class _NcCalcSizeParams(ctypes.Structure):
    _fields_ = [("rgrc", wintypes.RECT * 3), ("lppos", ctypes.c_void_p)]


_WNDPROC = ctypes.WINFUNCTYPE(ctypes.c_ssize_t, wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)
_subclasses: dict[int, tuple] = {}


class _MonitorInfo(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("rcMonitor", wintypes.RECT),
        ("rcWork", wintypes.RECT),
        ("dwFlags", wintypes.DWORD),
    ]


_ERROR_ALREADY_EXISTS = 183
_SW_SHOW = 5
_SW_RESTORE = 9
_MB_YESNO = 0x04
_MB_ICONWARNING = 0x30
_MB_ICONERROR = 0x10
_MB_DEFBUTTON2 = 0x100
_MB_SETFOREGROUND = 0x10000
_MB_TOPMOST = 0x40000
_IDYES = 6
_DWMWA_BORDER_COLOR = 34
_DWMWA_CAPTION_COLOR = 35
_GWL_STYLE = -16
_WS_CAPTION = 0x00C00000
_SWP_FLAGS = 0x0001 | 0x0002 | 0x0004 | 0x0010 | 0x0020
_SW_MINIMIZE = 6
_SW_MAXIMIZE = 3
_WM_CLOSE = 0x0010
_WM_NCLBUTTONDOWN = 0x00A1
_HTCAPTION = 2
_GWLP_WNDPROC = -4
_WM_NCCALCSIZE = 0x0083
_RESIZE_EDGES = {"top": 12, "top-left": 13, "top-right": 14}
_SM_CXSIZEFRAME = 32
_SM_CXPADDEDBORDER = 92

_mutex = None


def acquire_single_instance(name: str) -> bool:
    global _mutex
    _mutex = _kernel32.CreateMutexW(None, False, name)
    return ctypes.get_last_error() != _ERROR_ALREADY_EXISTS


def bring_to_front(hwnd: int) -> None:
    _user32.ShowWindow(hwnd, _SW_RESTORE if _user32.IsIconic(hwnd) else _SW_SHOW)
    _user32.SetForegroundWindow(hwnd)


def focus_window(title: str) -> bool:
    hwnd = _user32.FindWindowW(None, title)
    if not hwnd:
        return False
    bring_to_front(hwnd)
    return True


def confirm(title: str, message: str) -> bool:
    flags = _MB_YESNO | _MB_ICONWARNING | _MB_DEFBUTTON2 | _MB_SETFOREGROUND | _MB_TOPMOST
    return _user32.MessageBoxW(None, message, title, flags) == _IDYES


def show_error(title: str, message: str) -> None:
    _user32.MessageBoxW(None, message, title, _MB_ICONERROR | _MB_SETFOREGROUND | _MB_TOPMOST)


def _remove_top_frame(hwnd: int) -> None:
    original = _user32.GetWindowLongPtrW(hwnd, _GWLP_WNDPROC)

    def proc(window, message, wparam, lparam):
        if message == _WM_NCCALCSIZE and wparam and not _user32.IsZoomed(window):
            params = ctypes.cast(lparam, ctypes.POINTER(_NcCalcSizeParams)).contents
            top = params.rgrc[0].top
            result = _user32.CallWindowProcW(original, window, message, wparam, lparam)
            params.rgrc[0].top = top
            return result
        return _user32.CallWindowProcW(original, window, message, wparam, lparam)

    callback = _WNDPROC(proc)
    _subclasses[hwnd] = (callback, original)
    _user32.SetWindowLongPtrW(hwnd, _GWLP_WNDPROC, ctypes.cast(callback, ctypes.c_void_p).value)


def remove_title_bar(hwnd: int, frame_rgb: int) -> None:
    _remove_top_frame(hwnd)
    style = _user32.GetWindowLongPtrW(hwnd, _GWL_STYLE)
    _user32.SetWindowLongPtrW(hwnd, _GWL_STYLE, style & ~_WS_CAPTION)
    _user32.SetWindowPos(hwnd, None, 0, 0, 0, 0, _SWP_FLAGS)
    r, g, b = (frame_rgb >> 16) & 0xFF, (frame_rgb >> 8) & 0xFF, frame_rgb & 0xFF
    color = ctypes.c_uint(r | (g << 8) | (b << 16))
    for attribute in (_DWMWA_BORDER_COLOR, _DWMWA_CAPTION_COLOR):
        _dwmapi.DwmSetWindowAttribute(wintypes.HWND(hwnd), attribute, ctypes.byref(color), ctypes.sizeof(color))


def maximized_bounds(hwnd: int) -> tuple[int, int, int, int]:
    info = _MonitorInfo()
    info.cbSize = ctypes.sizeof(_MonitorInfo)
    monitor = _user32.MonitorFromWindow(hwnd, 2)
    _user32.GetMonitorInfoW(monitor, ctypes.byref(info))
    work, full = info.rcWork, info.rcMonitor
    dpi = _user32.GetDpiForWindow(hwnd) or 96
    frame = _user32.GetSystemMetricsForDpi(_SM_CXSIZEFRAME, dpi) + _user32.GetSystemMetricsForDpi(_SM_CXPADDEDBORDER, dpi)
    return (
        work.left - full.left - frame,
        work.top - full.top - frame,
        work.right - work.left + 2 * frame,
        work.bottom - work.top + 2 * frame,
    )


def is_maximized(hwnd: int) -> bool:
    return bool(_user32.IsZoomed(hwnd))


def minimize(hwnd: int) -> None:
    _user32.ShowWindow(hwnd, _SW_MINIMIZE)


def maximize(hwnd: int) -> None:
    _user32.ShowWindow(hwnd, _SW_MAXIMIZE)


def restore(hwnd: int) -> None:
    _user32.ShowWindow(hwnd, _SW_RESTORE)


def request_close(hwnd: int) -> None:
    _user32.PostMessageW(hwnd, _WM_CLOSE, 0, 0)


def begin_move(hwnd: int) -> None:
    _user32.ReleaseCapture()
    _user32.SendMessageW(hwnd, _WM_NCLBUTTONDOWN, _HTCAPTION, 0)


def begin_resize(hwnd: int, edge: str) -> None:
    _user32.ReleaseCapture()
    _user32.SendMessageW(hwnd, _WM_NCLBUTTONDOWN, _RESIZE_EDGES[edge], 0)
