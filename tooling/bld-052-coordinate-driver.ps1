<#
BLD-052 coordinate-only packaged visual-usability driver.

This file intentionally has no application or DOM knowledge.  The only input
surface is a bounded action list containing desktop coordinates.  It is meant
to be run by Windows PowerShell 5.1 on a disposable Windows qualification
machine; it uses the inbox .NET/Win32 APIs and adds no package or runtime.

Action file shape:
{
  "executable": "C:\\qualification\\RSrender.exe",
  "arguments": [],
  "workflow": "synthetic-coordinate-qualification",
  "persona": "constrained-viewport",
  "sourceDigests": { "package/file.ts": "sha256:<64 hex>" },
  "actions": [
    { "op": "launch" },
    { "op": "focus" },
    { "op": "screenshot", "label": "initial" },
    { "op": "click", "x": 400, "y": 220 },
    { "op": "move", "x": 500, "y": 220 },
    { "op": "drag", "from": { "x": 400, "y": 220 }, "to": { "x": 500, "y": 220 } },
    { "op": "scroll", "x": 600, "y": 450, "dx": 0, "dy": -3 },
    { "op": "key", "key": "CTRL+S" },
    { "op": "type", "text": "Synthetic qualification note" },
    { "op": "wait", "milliseconds": 250 },
    { "op": "close" }
  ]
}

The output directory receives one timestamped PNG for every action and two
JSON files: action-transcript.jsonl and run-summary.json.  Typed text is
represented by length/hash only.  Do not put client data or credentials in an
action file; this harness is for synthetic fixtures only.

When the host denies foreground ownership, the driver records
inputMode=window-message and addresses only the verified launched window using
its current screen rect and DPI-adjusted client coordinates.  The normal
foreground-sendinput path remains unchanged when foreground ownership is
available.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string] $ActionFile,

  [string] $OutputDirectory = (Join-Path (Get-Location) ".tmp\bld-052-coordinate-run"),

  [ValidateRange(1, 250)]
  [int] $MaxActions = 100,

  [ValidateRange(1, 900)]
  [int] $TimeoutSeconds = 120,

  [switch] $KeepOpen
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not ([System.Management.Automation.PSTypeName]::new("Bld052.Native")).Type) {
  Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

namespace Bld052 {
  public static class Native {
    public const uint INPUT_MOUSE = 0;
    public const uint INPUT_KEYBOARD = 1;
    public const uint MOUSEEVENTF_MOVE = 0x0001;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
    public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
    public const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
    public const uint MOUSEEVENTF_WHEEL = 0x0800;
    public const uint MOUSEEVENTF_HWHEEL = 0x1000;
    public const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const uint KEYEVENTF_UNICODE = 0x0004;
    public const uint WM_CLOSE = 0x0010;
    public const uint WM_KEYDOWN = 0x0100;
    public const uint WM_KEYUP = 0x0101;
    public const uint WM_CHAR = 0x0102;
    public const uint MAPVK_VK_TO_VSC = 0;
    public const uint WM_MOUSEMOVE = 0x0200;
    public const uint WM_LBUTTONDOWN = 0x0201;
    public const uint WM_LBUTTONUP = 0x0202;
    public const uint WM_LBUTTONDBLCLK = 0x0203;
    public const uint WM_RBUTTONDOWN = 0x0204;
    public const uint WM_RBUTTONUP = 0x0205;
    public const uint WM_RBUTTONDBLCLK = 0x0206;
    public const uint WM_MBUTTONDOWN = 0x0207;
    public const uint WM_MBUTTONUP = 0x0208;
    public const uint WM_MBUTTONDBLCLK = 0x0209;
    public const uint WM_MOUSEWHEEL = 0x020A;
    public const uint WM_MOUSEHWHEEL = 0x020E;
    public const uint MK_LBUTTON = 0x0001;
    public const uint MK_RBUTTON = 0x0002;
    public const uint MK_MBUTTON = 0x0010;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_NOACTIVATE = 0x0010;
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const int SM_XVIRTUALSCREEN = 76;
    public const int SM_YVIRTUALSCREEN = 77;
    public const int SM_CXVIRTUALSCREEN = 78;
    public const int SM_CYVIRTUALSCREEN = 79;
    public const uint HWND_TOPMOST = 0xFFFFFFFF;

    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
      public uint type;
      public InputUnion u;
    }

    [StructLayout(LayoutKind.Explicit)]
    public struct InputUnion {
      [FieldOffset(0)] public MOUSEINPUT mouse;
      [FieldOffset(0)] public KEYBDINPUT keyboard;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
      public int dx;
      public int dy;
      public uint mouseData;
      public uint dwFlags;
      public uint time;
      public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
      public ushort wVk;
      public ushort wScan;
      public uint dwFlags;
      public uint time;
      public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
      public int Left;
      public int Top;
      public int Right;
      public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
      public int X;
      public int Y;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
      public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
      public IO_COUNTERS IoInfo;
      public UIntPtr ProcessMemoryLimit;
      public UIntPtr JobMemoryLimit;
      public UIntPtr PeakProcessMemoryUsed;
      public UIntPtr PeakJobMemoryUsed;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
      public long PerProcessUserTimeLimit;
      public long PerJobUserTimeLimit;
      public uint LimitFlags;
      public UIntPtr MinimumWorkingSetSize;
      public UIntPtr MaximumWorkingSetSize;
      public uint ActiveProcessLimit;
      public UIntPtr Affinity;
      public uint PriorityClass;
      public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential, Size = 48)]
    public struct IO_COUNTERS { }

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool GetCursorPos(out POINT point);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint SendInput(uint count, INPUT[] inputs, int size);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool GetKeyboardState([Out] byte[] keyState);
    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetKeyboardState([In] byte[] keyState);
    [DllImport("user32.dll")]
    public static extern uint MapVirtualKey(uint code, uint mapType);
    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool AttachThreadInput(uint attach, uint attachTo, bool attachFlag);
    [DllImport("user32.dll")]
    public static extern IntPtr SetFocus(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr SetActiveWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern void SwitchToThisWindow(IntPtr hWnd, bool altTab);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int command);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool PostMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool ScreenToClient(IntPtr hWnd, ref POINT point);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int index);
    [DllImport("user32.dll")]
    public static extern uint GetDpiForWindow(IntPtr hWnd);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr OpenProcess(uint access, bool inherit, int processId);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool TerminateJobObject(IntPtr job, uint code);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr handle);

    public static bool ActivateWindowWithThreadInput(IntPtr hWnd) {
      uint targetProcessId;
      uint targetThreadId = GetWindowThreadProcessId(hWnd, out targetProcessId);
      uint currentThreadId = GetCurrentThreadId();
      bool attached = targetThreadId != 0 && currentThreadId != 0 && targetThreadId != currentThreadId && AttachThreadInput(currentThreadId, targetThreadId, true);
      try {
        ShowWindow(hWnd, 9);
        BringWindowToTop(hWnd);
        SetActiveWindow(hWnd);
        SetFocus(hWnd);
        return SetForegroundWindow(hWnd);
      } finally {
        if (attached) AttachThreadInput(currentThreadId, targetThreadId, false);
      }
    }

    public static IntPtr CreateKillOnCloseJob() {
      IntPtr job = CreateJobObject(IntPtr.Zero, null);
      if (job == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateJobObject");
      var limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
      limits.BasicLimitInformation.LimitFlags = 0x00002000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
      int size = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
      IntPtr memory = Marshal.AllocHGlobal(size);
      try {
        Marshal.StructureToPtr(limits, memory, false);
        if (!SetInformationJobObject(job, 9, memory, (uint)size)) {
          CloseHandle(job);
          throw new Win32Exception(Marshal.GetLastWin32Error(), "SetInformationJobObject");
        }
      } finally { Marshal.FreeHGlobal(memory); }
      return job;
    }

    public static bool TryAssignLaunchedProcess(IntPtr job, int processId) {
      const uint access = 0x0001 | 0x0400 | 0x0800; // terminate, query, set quota
      IntPtr process = OpenProcess(access, false, processId);
      if (process == IntPtr.Zero) return false;
      try {
        return AssignProcessToJobObject(job, process);
      } finally { CloseHandle(process); }
    }

    public static void TerminateAndCloseJob(IntPtr job) {
      if (job == IntPtr.Zero) return;
      TerminateJobObject(job, 0xB1052);
      CloseHandle(job); // KILL_ON_JOB_CLOSE also covers children created by the launched root.
    }

    public static void CloseJob(IntPtr job) {
      if (job != IntPtr.Zero) CloseHandle(job);
    }
  }
}
"@
}

function Convert-ToObject([object] $Value) {
  if ($null -eq $Value) { return $null }
  return $Value
}

function Get-OptionalProperty([object] $Object, [string] $Name) {
  if ($null -eq $Object -or $null -eq $Object.PSObject.Properties[$Name]) { return $null }
  return $Object.PSObject.Properties[$Name].Value
}

function Get-StringHash([string] $Value) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
    return ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Get-FileHashHex([string] $Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Assert-Integer([object] $Value, [string] $Name, [int] $Minimum, [int] $Maximum) {
  if ($null -eq $Value -or $Value -is [bool] -or -not ($Value -is [byte] -or $Value -is [int16] -or $Value -is [int32] -or $Value -is [int64] -or $Value -is [double] -or $Value -is [decimal])) {
    throw "BLD052_${Name}_INVALID"
  }
  $number = [int] $Value
  if ($number -ne [double] $Value -or $number -lt $Minimum -or $number -gt $Maximum) { throw "BLD052_${Name}_OUT_OF_RANGE" }
  return $number
}

function Get-BoundedLabel([object] $Value, [string] $Name, [string] $Fallback) {
  if ($null -eq $Value) { return $Fallback }
  $label = ([string]$Value).Trim()
  if ([string]::IsNullOrWhiteSpace($label) -or $label.Length -gt 80 -or $label -notmatch "^[A-Za-z0-9][A-Za-z0-9_. -]{0,79}$") { throw "BLD052_${Name}_INVALID" }
  return $label
}

function Get-ActionOperation([object] $Action) {
  $operation = Get-OptionalProperty $Action "op"
  if ($null -eq $Action -or [string]::IsNullOrWhiteSpace([string] $operation)) { throw "BLD052_ACTION_OPERATION_REQUIRED" }
  return ([string] $operation).Trim().ToLowerInvariant()
}

function Get-Point([object] $Point, [string] $Name) {
  if ($null -eq $Point) { throw "BLD052_${Name}_REQUIRED" }
  return @{
    x = Assert-Integer (Get-OptionalProperty $Point "x") "${Name}_X" -100000 100000
    y = Assert-Integer (Get-OptionalProperty $Point "y") "${Name}_Y" -100000 100000
  }
}

function New-InputMouse([uint32] $Flags, [uint32] $Data = 0) {
  $input = New-Object Bld052.Native+INPUT
  $input.type = [Bld052.Native]::INPUT_MOUSE
  $input.u.mouse.dx = 0
  $input.u.mouse.dy = 0
  $input.u.mouse.mouseData = $Data
  $input.u.mouse.dwFlags = $Flags
  $input.u.mouse.time = 0
  $input.u.mouse.dwExtraInfo = [IntPtr]::Zero
  return $input
}

function New-InputKey([uint16] $VirtualKey, [uint16] $Scan, [uint32] $Flags) {
  $input = New-Object Bld052.Native+INPUT
  $input.type = [Bld052.Native]::INPUT_KEYBOARD
  $input.u.keyboard.wVk = $VirtualKey
  $input.u.keyboard.wScan = $Scan
  $input.u.keyboard.dwFlags = $Flags
  $input.u.keyboard.time = 0
  $input.u.keyboard.dwExtraInfo = [IntPtr]::Zero
  return $input
}

function Send-Inputs([Bld052.Native+INPUT[]] $Inputs) {
  if ($Inputs.Count -eq 0) { return }
  $sent = [Bld052.Native]::SendInput([uint32] $Inputs.Count, $Inputs, [Runtime.InteropServices.Marshal]::SizeOf([type] [Bld052.Native+INPUT]))
  if ($sent -ne $Inputs.Count) { throw "BLD052_SEND_INPUT_FAILED" }
}

function Set-DesktopCursor([int] $X, [int] $Y) {
  if (-not [Bld052.Native]::SetCursorPos($X, $Y)) { throw "BLD052_CURSOR_FAILED" }
}

function Get-DesktopCursor() {
  $point = New-Object Bld052.Native+POINT
  if (-not [Bld052.Native]::GetCursorPos([ref] $point)) { throw "BLD052_CURSOR_READ_FAILED" }
  return [ordered] @{ x = $point.X; y = $point.Y }
}

function Get-WindowRectMetadata([IntPtr] $Window) {
  if ($Window -eq [IntPtr]::Zero) { return $null }
  $rect = New-Object Bld052.Native+RECT
  if (-not [Bld052.Native]::GetWindowRect($Window, [ref] $rect)) { throw "BLD052_WINDOW_RECT_FAILED" }
  $width = $rect.Right - $rect.Left; $height = $rect.Bottom - $rect.Top
  if ($width -lt 1 -or $height -lt 1 -or $width -gt 30000 -or $height -gt 30000) { throw "BLD052_WINDOW_BOUNDS_INVALID" }
  return [ordered] @{ left = $rect.Left; top = $rect.Top; right = $rect.Right; bottom = $rect.Bottom; width = $width; height = $height }
}

function Get-ActionInputContext() {
  if ($null -eq $script:process) { throw "BLD052_LAUNCH_REQUIRED" }
  $window = Wait-ForMainWindow $script:process $deadline
  $foreground = [Bld052.Native]::GetForegroundWindow()
  $isForeground = $foreground.ToInt64() -eq $window.ToInt64()
  $script:lastWindowHandle = $window
  $script:lastInputMode = if ($isForeground) { "foreground-sendinput" } else { "window-message" }
  return [pscustomobject]@{ window = $window; foreground = $isForeground; rect = Get-WindowRectMetadata $window }
}

function Use-WindowMessagePointerInput([pscustomobject] $Context) {
  if (-not $Context.foreground) { return $true }
  $dpi = [Bld052.Native]::GetDpiForWindow($Context.window)
  # PowerShell 5.1 is commonly DPI-unaware. In that case SetCursorPos is
  # virtualized and misses physical screenshot coordinates on a scaled
  # display. Address the verified target window directly at non-96 DPI.
  return $dpi -ne 96
}

function Convert-ScreenPointToClient([IntPtr] $Window, [int] $X, [int] $Y) {
  $point = New-Object Bld052.Native+POINT
  $point.X = $X; $point.Y = $Y
  if (-not [Bld052.Native]::ScreenToClient($Window, [ref] $point)) { throw "BLD052_SCREEN_TO_CLIENT_FAILED" }
  # Electron's renderer is commonly DPI-scaled while the top-level Win32
  # message coordinates remain logical client units. Convert the verified
  # screen-to-client result once, using only this window's reported DPI.
  $dpi = [Bld052.Native]::GetDpiForWindow($Window)
  if ($dpi -lt 1 -or $dpi -gt 768) { $dpi = 96 }
  $point.X = [int][Math]::Round($point.X * 96.0 / $dpi)
  $point.Y = [int][Math]::Round($point.Y * 96.0 / $dpi)
  return $point
}

function Convert-PointLParam([int] $X, [int] $Y) {
  if ($X -lt -32768 -or $X -gt 32767 -or $Y -lt -32768 -or $Y -gt 32767) { throw "BLD052_CLIENT_POINT_OUT_OF_RANGE" }
  $packed = ([uint32]([uint16]$X)) -bor ([uint32]([uint16]$Y) -shl 16)
  return [IntPtr]([int64]$packed)
}

function Send-WindowMessage([IntPtr] $Window, [uint32] $Message, [IntPtr] $WParam, [IntPtr] $LParam) {
  [Bld052.Native]::SendMessage($Window, $Message, $WParam, $LParam) | Out-Null
}

function Resolve-WindowMouseMessages([string] $Button) {
  switch ($Button.Trim().ToLowerInvariant()) {
    "left" { return [ordered] @{ down = [Bld052.Native]::WM_LBUTTONDOWN; up = [Bld052.Native]::WM_LBUTTONUP; double = [Bld052.Native]::WM_LBUTTONDBLCLK; mask = [Bld052.Native]::MK_LBUTTON } }
    "right" { return [ordered] @{ down = [Bld052.Native]::WM_RBUTTONDOWN; up = [Bld052.Native]::WM_RBUTTONUP; double = [Bld052.Native]::WM_RBUTTONDBLCLK; mask = [Bld052.Native]::MK_RBUTTON } }
    "middle" { return [ordered] @{ down = [Bld052.Native]::WM_MBUTTONDOWN; up = [Bld052.Native]::WM_MBUTTONUP; double = [Bld052.Native]::WM_MBUTTONDBLCLK; mask = [Bld052.Native]::MK_MBUTTON } }
    default { throw "BLD052_MOUSE_BUTTON_UNSUPPORTED:$($Button.Trim().ToLowerInvariant())" }
  }
}

function Send-WindowMouseButton([IntPtr] $Window, [string] $Button, [bool] $DoubleClick, [int] $X, [int] $Y) {
  $client = Convert-ScreenPointToClient $Window $X $Y
  $messages = Resolve-WindowMouseMessages $Button
  $lParam = Convert-PointLParam $client.X $client.Y
  Send-WindowMessage $Window ([Bld052.Native]::WM_MOUSEMOVE) ([IntPtr]$messages.mask) $lParam
  if ($DoubleClick) {
    Send-WindowMessage $Window ([uint32]$messages.down) ([IntPtr]$messages.mask) $lParam
    Send-WindowMessage $Window ([uint32]$messages.up) ([IntPtr]::Zero) $lParam
    Send-WindowMessage $Window ([uint32]$messages.double) ([IntPtr]$messages.mask) $lParam
  } else {
    Send-WindowMessage $Window ([uint32]$messages.down) ([IntPtr]$messages.mask) $lParam
  }
  Send-WindowMessage $Window ([uint32]$messages.up) ([IntPtr]::Zero) $lParam
}

function Send-WindowMouseMove([IntPtr] $Window, [int] $X, [int] $Y, [uint32] $Buttons = 0) {
  $client = Convert-ScreenPointToClient $Window $X $Y
  Send-WindowMessage $Window ([Bld052.Native]::WM_MOUSEMOVE) ([IntPtr]$Buttons) (Convert-PointLParam $client.X $client.Y)
}

function Send-WindowWheel([IntPtr] $Window, [int] $X, [int] $Y, [int] $Dx, [int] $Dy) {
  # WM_MOUSEWHEEL/HWHEEL carries screen coordinates in lParam. The window
  # handle is still the sole target; no global cursor or foreground state is
  # changed in this fallback.
  $screenPoint = Convert-PointLParam $X $Y
  if ($Dy -ne 0) { Send-WindowMessage $Window ([Bld052.Native]::WM_MOUSEWHEEL) ([IntPtr](Convert-WheelData ($Dy * 120) -bor 0)) $screenPoint }
  if ($Dx -ne 0) { Send-WindowMessage $Window ([Bld052.Native]::WM_MOUSEHWHEEL) ([IntPtr](Convert-WheelData ($Dx * 120) -bor 0)) $screenPoint }
}

$VirtualKeys = @{
  "BACKSPACE" = 0x08; "TAB" = 0x09; "ENTER" = 0x0D; "SHIFT" = 0x10; "CTRL" = 0x11; "ALT" = 0x12; "PAUSE" = 0x13; "CAPSLOCK" = 0x14; "ESC" = 0x1B; "SPACE" = 0x20
  "PAGEUP" = 0x21; "PAGEDOWN" = 0x22; "END" = 0x23; "HOME" = 0x24; "LEFT" = 0x25; "UP" = 0x26; "RIGHT" = 0x27; "DOWN" = 0x28; "INSERT" = 0x2D; "DELETE" = 0x2E
  "WIN" = 0x5B; "LWIN" = 0x5B; "RWIN" = 0x5C; "NUMLOCK" = 0x90; "SCROLLLOCK" = 0x91
}
for ($n = 1; $n -le 24; $n++) { $VirtualKeys["F$n"] = 0x6F + $n }
foreach ($character in ([char[]] "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")) { $VirtualKeys[[string] $character] = [int] $character }

function Resolve-Key([string] $Key) {
  $name = $Key.Trim().ToUpperInvariant()
  if ($VirtualKeys.ContainsKey($name)) { return [int] $VirtualKeys[$name] }
  throw "BLD052_KEY_UNSUPPORTED:$name"
}

function Convert-KeyMessageLParam([int] $VirtualKey, [bool] $KeyUp) {
  $scanCode = [Bld052.Native]::MapVirtualKey([uint32]$VirtualKey, [Bld052.Native]::MAPVK_VK_TO_VSC)
  if ($scanCode -eq 0) { throw "BLD052_KEY_SCAN_CODE_UNAVAILABLE:$VirtualKey" }
  # WM_KEY* lParam: repeat count, scan code, extended-key bit, and the
  # previous/transition bits on key-up. Chromium uses the scan code and
  # message state while translating a directly delivered Win32 key message.
  [uint32]$value = 1 -bor ($scanCode -shl 16)
  if ($VirtualKey -in @(0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x2D, 0x2E, 0x5B, 0x5C)) {
    $value = $value -bor ([uint32]1 -shl 24)
  }
  if ($KeyUp) { $value = $value -bor ([uint32]3221225472) }
  return [IntPtr]([int64]$value)
}

function Send-KeyChord([string] $Key) {
  $parts = @($Key.Split("+", [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim().ToUpperInvariant() })
  if ($parts.Count -lt 1 -or $parts.Count -gt 5) { throw "BLD052_KEY_CHORD_INVALID" }
  $modifiers = @("CTRL", "SHIFT", "ALT", "WIN")
  $modifierInputs = @()
  $main = $null
  foreach ($part in $parts) {
    if ($modifiers -contains $part) { $modifierInputs += New-InputKey (Resolve-Key $part) 0 0 }
    elseif ($null -eq $main) { $main = $part }
    else { throw "BLD052_KEY_CHORD_INVALID" }
  }
  if ($null -eq $main) { throw "BLD052_KEY_REQUIRED" }
  $mainKey = Resolve-Key $main
  $inputs = @($modifierInputs) + @(New-InputKey $mainKey 0 0) + @(New-InputKey $mainKey 0 ([Bld052.Native]::KEYEVENTF_KEYUP))
  for ($index = $modifierInputs.Count - 1; $index -ge 0; $index--) {
    $inputs += New-InputKey (Resolve-Key $parts[$index]) 0 ([Bld052.Native]::KEYEVENTF_KEYUP)
  }
  Send-Inputs ([Bld052.Native+INPUT[]] $inputs)
}

function Send-WindowKeyChord([IntPtr] $Window, [string] $Key) {
  $parts = @($Key.Split("+", [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim().ToUpperInvariant() })
  if ($parts.Count -lt 1 -or $parts.Count -gt 5) { throw "BLD052_KEY_CHORD_INVALID" }
  $modifiers = @("CTRL", "SHIFT", "ALT", "WIN")
  $main = $null; $modifierKeys = @()
  foreach ($part in $parts) {
    if ($modifiers -contains $part) { $modifierKeys += (Resolve-Key $part) }
    elseif ($null -eq $main) { $main = $part }
    else { throw "BLD052_KEY_CHORD_INVALID" }
  }
  if ($null -eq $main) { throw "BLD052_KEY_REQUIRED" }
  $mainKey = Resolve-Key $main
  $targetProcessId = [uint32]0
  $targetThreadId = [Bld052.Native]::GetWindowThreadProcessId($Window, [ref]$targetProcessId)
  $currentThreadId = [Bld052.Native]::GetCurrentThreadId()
  if ($targetThreadId -eq 0 -or $currentThreadId -eq 0) { throw "BLD052_KEYBOARD_THREAD_UNAVAILABLE" }
  $attached = $false
  $stateCaptured = $false
  $priorState = New-Object byte[] 256
  try {
    # WM_KEYDOWN does not mutate a target thread's asynchronous key state.
    # Attach the input queues briefly and set only the modifier high bits so
    # Chromium observes ctrlKey/shiftKey/etc. during native message routing.
    if ($targetThreadId -ne $currentThreadId) {
      $attached = [Bld052.Native]::AttachThreadInput($currentThreadId, $targetThreadId, $true)
      if (-not $attached) { throw "BLD052_KEYBOARD_ATTACH_FAILED" }
    }
    if (-not [Bld052.Native]::GetKeyboardState($priorState)) { throw "BLD052_KEYBOARD_STATE_READ_FAILED" }
    $stateCaptured = $true
    $chordState = New-Object byte[] 256
    [Array]::Copy($priorState, $chordState, 256)
    foreach ($modifier in $modifierKeys) { $chordState[$modifier] = [byte]($chordState[$modifier] -bor 0x80) }
    if (-not [Bld052.Native]::SetKeyboardState($chordState)) { throw "BLD052_KEYBOARD_STATE_SET_FAILED" }

    foreach ($modifier in $modifierKeys) {
      Send-WindowMessage $Window ([Bld052.Native]::WM_KEYDOWN) ([IntPtr]$modifier) (Convert-KeyMessageLParam $modifier $false)
    }
    Send-WindowMessage $Window ([Bld052.Native]::WM_KEYDOWN) ([IntPtr]$mainKey) (Convert-KeyMessageLParam $mainKey $false)
    Send-WindowMessage $Window ([Bld052.Native]::WM_KEYUP) ([IntPtr]$mainKey) (Convert-KeyMessageLParam $mainKey $true)
    for ($index = $modifierKeys.Count - 1; $index -ge 0; $index--) {
      $modifier = $modifierKeys[$index]
      Send-WindowMessage $Window ([Bld052.Native]::WM_KEYUP) ([IntPtr]$modifier) (Convert-KeyMessageLParam $modifier $true)
    }
  } finally {
    if ($stateCaptured) { [Bld052.Native]::SetKeyboardState($priorState) | Out-Null }
    if ($attached) { [Bld052.Native]::AttachThreadInput($currentThreadId, $targetThreadId, $false) | Out-Null }
  }
}

function Send-UnicodeText([string] $Text) {
  if ($null -eq $Text -or $Text.Length -gt 10000) { throw "BLD052_TYPE_TEXT_OUT_OF_RANGE" }
  $inputs = @()
  foreach ($unit in $Text.ToCharArray()) {
    $scan = [uint16] [char] $unit
    $inputs += New-InputKey 0 $scan ([Bld052.Native]::KEYEVENTF_UNICODE)
    $inputs += New-InputKey 0 $scan ([Bld052.Native]::KEYEVENTF_UNICODE -bor [Bld052.Native]::KEYEVENTF_KEYUP)
  }
  Send-Inputs ([Bld052.Native+INPUT[]] $inputs)
}

function Send-WindowUnicodeText([IntPtr] $Window, [string] $Text) {
  if ($null -eq $Text -or $Text.Length -gt 10000) { throw "BLD052_TYPE_TEXT_OUT_OF_RANGE" }
  foreach ($unit in $Text.ToCharArray()) {
    # WM_CHAR consumes UTF-16 code units, including both units of a surrogate
    # pair, and is delivered synchronously to the verified launched window.
    Send-WindowMessage $Window ([Bld052.Native]::WM_CHAR) ([IntPtr]([uint16][char]$unit)) ([IntPtr]::Zero)
  }
}

function Send-MouseButton([string] $Button, [bool] $Down) {
  $name = $Button.Trim().ToLowerInvariant()
  $flags = switch ($name) {
    "left" { if ($Down) { [Bld052.Native]::MOUSEEVENTF_LEFTDOWN } else { [Bld052.Native]::MOUSEEVENTF_LEFTUP } }
    "right" { if ($Down) { [Bld052.Native]::MOUSEEVENTF_RIGHTDOWN } else { [Bld052.Native]::MOUSEEVENTF_RIGHTUP } }
    "middle" { if ($Down) { [Bld052.Native]::MOUSEEVENTF_MIDDLEDOWN } else { [Bld052.Native]::MOUSEEVENTF_MIDDLEUP } }
    default { throw "BLD052_MOUSE_BUTTON_UNSUPPORTED:$name" }
  }
  Send-Inputs ([Bld052.Native+INPUT[]] @(New-InputMouse $flags))
}

function Convert-WheelData([int] $Value) {
  return [uint32] ([int64] $Value -band 0xFFFFFFFFL)
}

function Wait-Bounded([int] $Milliseconds) {
  $value = Assert-Integer $Milliseconds "WAIT_MILLISECONDS" 0 30000
  if ($value -gt 0) { Start-Sleep -Milliseconds $value }
}

function Get-DesktopBounds() {
  return @{
    left = [Bld052.Native]::GetSystemMetrics([Bld052.Native]::SM_XVIRTUALSCREEN)
    top = [Bld052.Native]::GetSystemMetrics([Bld052.Native]::SM_YVIRTUALSCREEN)
    width = [Bld052.Native]::GetSystemMetrics([Bld052.Native]::SM_CXVIRTUALSCREEN)
    height = [Bld052.Native]::GetSystemMetrics([Bld052.Native]::SM_CYVIRTUALSCREEN)
  }
}

function Save-DesktopScreenshot([string] $Path) {
  Add-Type -AssemblyName System.Drawing
  $bounds = Get-DesktopBounds
  if ($bounds.width -lt 1 -or $bounds.height -lt 1 -or $bounds.width -gt 30000 -or $bounds.height -gt 30000) { throw "BLD052_DESKTOP_BOUNDS_INVALID" }
  $bitmap = New-Object System.Drawing.Bitmap($bounds.width, $bounds.height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb))
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen($bounds.left, $bounds.top, 0, 0, [System.Drawing.Size]::new($bounds.width, $bounds.height), [System.Drawing.CopyPixelOperation]::SourceCopy)
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Save-WindowScreenshot([IntPtr] $Window, [string] $Path) {
  $rect = New-Object Bld052.Native+RECT
  if (-not [Bld052.Native]::GetWindowRect($Window, [ref] $rect)) { throw "BLD052_WINDOW_RECT_FAILED" }
  $width = $rect.Right - $rect.Left; $height = $rect.Bottom - $rect.Top
  if ($width -lt 1 -or $height -lt 1 -or $width -gt 30000 -or $height -gt 30000) { throw "BLD052_WINDOW_BOUNDS_INVALID" }
  $bitmap = New-Object System.Drawing.Bitmap($width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb))
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $hdc = [IntPtr]::Zero
  $mode = "print-window"
  try {
    $hdc = $graphics.GetHdc()
    $printed = [Bld052.Native]::PrintWindow($Window, $hdc, 2)
    $graphics.ReleaseHdc($hdc); $hdc = [IntPtr]::Zero
    if (-not $printed) {
      # PrintWindow is preferred for DWM/covered windows. The bounded rect
      # copy is a fallback for windows that do not implement PrintWindow.
      $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, [System.Drawing.Size]::new($width, $height), [System.Drawing.CopyPixelOperation]::SourceCopy)
      $mode = "window-rect-screen-fallback"
    }
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    if ($hdc -ne [IntPtr]::Zero) { $graphics.ReleaseHdc($hdc) }
    $graphics.Dispose(); $bitmap.Dispose()
  }
  return [ordered] @{ path = [System.IO.Path]::GetFileName($Path); sha256 = "sha256:$((Get-FileHashHex $Path))"; captureMode = $mode; rect = [ordered] @{ left = $rect.Left; top = $rect.Top; right = $rect.Right; bottom = $rect.Bottom; width = $width; height = $height }; capturedAtUtc = [datetime]::UtcNow.ToString("o") }
}

function Get-MainWindow([System.Diagnostics.Process] $Process) {
  $Process.Refresh()
  $handle = $Process.MainWindowHandle
  if ($handle -eq [IntPtr]::Zero -or $handle.ToInt64() -eq 0) { return $null }
  return $handle
}

function Wait-ForMainWindow([System.Diagnostics.Process] $Process, [datetime] $Deadline) {
  while ([datetime]::UtcNow -lt $Deadline) {
    $handle = Get-MainWindow $Process
    if ($null -ne $handle) { return $handle }
    Start-Sleep -Milliseconds 100
  }
  throw "BLD052_MAIN_WINDOW_TIMEOUT"
}

function Stop-LaunchedRootOnly() {
  if ($null -eq $script:process) { return }
  try {
    $candidate = Get-Process -Id $script:process.Id -ErrorAction Stop
    $candidatePath = $candidate.Path
    if ([string]::IsNullOrWhiteSpace($candidatePath) -or [System.IO.Path]::GetFullPath($candidatePath) -ne $executable) { return }
    $candidate.Kill()
    $candidate.WaitForExit(3000) | Out-Null
  } catch { }
}

function Convert-TranscriptValue([object] $Value) {
  if ($Value -is [System.Collections.IDictionary]) {
    $map = [ordered] @{}
    foreach ($key in $Value.Keys) { $map[$key] = Convert-TranscriptValue $Value[$key] }
    return $map
  }
  if ($Value -is [System.Array]) { return @($Value | ForEach-Object { Convert-TranscriptValue $_ }) }
  return $Value
}

$runStarted = [datetime]::UtcNow
$script:runFailure = $null
$actionFileFull = [System.IO.Path]::GetFullPath($ActionFile)
if (-not (Test-Path -LiteralPath $actionFileFull -PathType Leaf)) { throw "BLD052_ACTION_FILE_NOT_FOUND" }
$spec = Get-Content -LiteralPath $actionFileFull -Raw | ConvertFrom-Json
$workflow = Get-BoundedLabel (Get-OptionalProperty $spec "workflow") "WORKFLOW" "synthetic-coordinate-qualification"
$persona = Get-BoundedLabel (Get-OptionalProperty $spec "persona") "PERSONA" "general-operator"
$actions = @(Get-OptionalProperty $spec "actions")
if ($null -eq $actions -or $actions.Count -lt 1) { throw "BLD052_ACTIONS_REQUIRED" }
if ($actions.Count -gt $MaxActions) { throw "BLD052_ACTION_COUNT_EXCEEDED" }
$executable = [string] (Get-OptionalProperty $spec "executable")
if ([string]::IsNullOrWhiteSpace($executable) -or -not [System.IO.Path]::IsPathRooted($executable) -or -not (Test-Path -LiteralPath $executable -PathType Leaf)) { throw "BLD052_EXECUTABLE_INVALID" }
$executable = [System.IO.Path]::GetFullPath($executable)
$executableHash = Get-FileHashHex $executable
$driverScriptFull = [System.IO.Path]::GetFullPath($MyInvocation.MyCommand.Path)
$sourceDigests = [ordered] @{
  "driver" = "sha256:$(Get-FileHashHex $driverScriptFull)"
  "actionFile" = "sha256:$(Get-FileHashHex $actionFileFull)"
}
$declaredSourceDigests = Get-OptionalProperty $spec "sourceDigests"
if ($null -ne $declaredSourceDigests) {
  foreach ($property in $declaredSourceDigests.psobject.Properties) {
    if ([string]::IsNullOrWhiteSpace([string]$property.Name) -or [string]$property.Name -in @("driver", "actionFile")) { throw "BLD052_SOURCE_DIGEST_NAME_INVALID" }
    $digest = [string] $property.Value
    if ($digest -notmatch "^sha256:[0-9a-fA-F]{64}$") { throw "BLD052_SOURCE_DIGEST_INVALID" }
    $sourceDigests[[string] $property.Name] = $digest.ToLowerInvariant()
  }
}

$outputFull = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $outputFull -Force | Out-Null
$transcriptPath = Join-Path $outputFull "action-transcript.jsonl"
$summaryPath = Join-Path $outputFull "run-summary.json"
Remove-Item -LiteralPath $transcriptPath -Force -ErrorAction SilentlyContinue
$deadline = $runStarted.AddSeconds($TimeoutSeconds)
$sequence = 0
$process = $null
$job = [IntPtr]::Zero
$closed = $false
$outcomes = @()
$script:lastInputMode = "none"
$script:lastWindowHandle = [IntPtr]::Zero

function Write-Transcript([object] $Record) {
  $json = $Record | ConvertTo-Json -Depth 12 -Compress
  Add-Content -LiteralPath $transcriptPath -Value $json -Encoding UTF8
}

function Capture-ActionScreenshot([int] $Index, [string] $Label) {
  $stamp = [datetime]::UtcNow.ToString("yyyyMMddTHHmmssfffZ", [Globalization.CultureInfo]::InvariantCulture)
  $safeLabel = ([string] $Label -replace "[^A-Za-z0-9_.-]", "-").Trim("-")
  if ([string]::IsNullOrWhiteSpace($safeLabel)) { $safeLabel = "action" }
  $path = Join-Path $outputFull ("screen-{0:D4}-{1}-{2}.png" -f $Index, $stamp, $safeLabel)
  Save-DesktopScreenshot $path
  $capture = [ordered] @{ path = [System.IO.Path]::GetFileName($path); sha256 = "sha256:$((Get-FileHashHex $path))"; captureMode = "virtual-desktop"; capturedAtUtc = [datetime]::UtcNow.ToString("o") }
  if ($null -ne $script:process) {
    try {
      $window = Get-MainWindow $script:process
      if ($null -ne $window) {
        $windowStamp = [datetime]::UtcNow.ToString("yyyyMMddTHHmmssfffZ", [Globalization.CultureInfo]::InvariantCulture)
        $windowPath = Join-Path $outputFull ("window-{0:D4}-{1}-{2}.png" -f $Index, $windowStamp, $safeLabel)
        $capture.window = Save-WindowScreenshot $window $windowPath
      }
    } catch { $capture.windowCaptureError = $_.Exception.Message }
  }
  return $capture
}

function Invoke-CoordinateAction([object] $Action, [int] $Index) {
  $operation = Get-ActionOperation $Action
  switch ($operation) {
    "launch" {
      if ($null -ne $script:process) { throw "BLD052_ALREADY_LAUNCHED" }
      $arguments = @()
      $declaredArguments = Get-OptionalProperty $spec "arguments"
      if ($null -ne $declaredArguments) { $arguments = @($declaredArguments | ForEach-Object { [string] $_ }) }
      $startParameters = @{ FilePath = $executable; WorkingDirectory = ([System.IO.Path]::GetDirectoryName($executable)); PassThru = $true }
      if ($arguments.Count -gt 0) { $startParameters.ArgumentList = $arguments }
      $script:process = Start-Process @startParameters
      $script:job = [Bld052.Native]::CreateKillOnCloseJob()
      if (-not [Bld052.Native]::TryAssignLaunchedProcess($script:job, $script:process.Id)) {
        # Some hosts place PowerShell itself in a non-nestable job.  Keep the
        # launched root identity and use the path-verified root-only fallback.
        [Bld052.Native]::CloseJob($script:job); $script:job = [IntPtr]::Zero
      }
      $launchWindow = Wait-ForMainWindow $script:process $deadline
      $script:lastInputMode = "window-control"
      $script:lastWindowHandle = $launchWindow
      return [ordered] @{ launchedPid = $script:process.Id; windowHandle = $launchWindow.ToInt64(); executableSha256 = "sha256:$executableHash" }
    }
    "focus" {
      if ($null -eq $script:process) { throw "BLD052_LAUNCH_REQUIRED" }
      $window = Wait-ForMainWindow $script:process $deadline
      [Bld052.Native]::ShowWindow($window, 9) | Out-Null
      [Bld052.Native]::BringWindowToTop($window) | Out-Null
      [Bld052.Native]::ActivateWindowWithThreadInput($window) | Out-Null
      [Bld052.Native]::SwitchToThisWindow($window, $true)
      Start-Sleep -Milliseconds 75
      $foreground = [Bld052.Native]::GetForegroundWindow()
      $focused = $foreground.ToInt64() -eq $window.ToInt64()
      if (-not $focused) {
        # A title-bar click is a bounded, ordinary user activation.  It is
        # safe because the exact launched window rect is the only target.
        $titleRect = New-Object Bld052.Native+RECT
        if ([Bld052.Native]::GetWindowRect($window, [ref] $titleRect) -and $titleRect.Right -gt $titleRect.Left -and $titleRect.Bottom -gt $titleRect.Top) {
          Set-DesktopCursor ($titleRect.Left + 20) ($titleRect.Top + 8)
          Send-MouseButton "left" $true
          Send-MouseButton "left" $false
          [Bld052.Native]::ActivateWindowWithThreadInput($window) | Out-Null
          Start-Sleep -Milliseconds 75
          $foreground = [Bld052.Native]::GetForegroundWindow()
          $focused = $foreground.ToInt64() -eq $window.ToInt64()
        }
      }
      $targetable = [Bld052.Native]::IsWindowVisible($window)
      $topmostFallback = $false
      if (-not $focused -and $targetable) {
        # Some secured desktop hosts deny foreground ownership even though
        # the exact visible window is valid. Keep it safely topmost so screen
        # coordinates still address the launched app and record that fact.
        [Bld052.Native]::SetWindowPos($window, [IntPtr] (-1), 0, 0, 0, 0, [Bld052.Native]::SWP_NOMOVE -bor [Bld052.Native]::SWP_NOSIZE -bor [Bld052.Native]::SWP_SHOWWINDOW) | Out-Null
        $topmostFallback = $true
        $titleRect = New-Object Bld052.Native+RECT
        if ([Bld052.Native]::GetWindowRect($window, [ref] $titleRect) -and $titleRect.Right -gt $titleRect.Left -and $titleRect.Bottom -gt $titleRect.Top) {
          Set-DesktopCursor ($titleRect.Left + 20) ($titleRect.Top + 8)
          Send-MouseButton "left" $true
          Send-MouseButton "left" $false
          [Bld052.Native]::ActivateWindowWithThreadInput($window) | Out-Null
          Start-Sleep -Milliseconds 75
          $foreground = [Bld052.Native]::GetForegroundWindow()
          $focused = $foreground.ToInt64() -eq $window.ToInt64()
        }
      }
      if (-not $focused -and -not $targetable) { throw "BLD052_FOCUS_FAILED" }
      $script:lastInputMode = if ($focused) { "foreground-activation" } else { "window-message" }
      $script:lastWindowHandle = $window
      return [ordered] @{ focused = $focused; targetable = $targetable; topmostFallback = $topmostFallback; windowHandle = $window.ToInt64(); foregroundHandle = $foreground.ToInt64() }
    }
    "screenshot" {
      $script:lastInputMode = "capture-only"
      return [ordered] @{ requested = $true }
    }
    "click" {
      $x = Assert-Integer (Get-OptionalProperty $Action "x") "CLICK_X" -100000 100000; $y = Assert-Integer (Get-OptionalProperty $Action "y") "CLICK_Y" -100000 100000
      $declaredButton = Get-OptionalProperty $Action "button"; $button = if ($null -eq $declaredButton) { "left" } else { [string] $declaredButton }
      $declaredCount = Get-OptionalProperty $Action "count"; $count = if ($null -eq $declaredCount) { 1 } else { Assert-Integer $declaredCount "CLICK_COUNT" 1 3 }
      $context = Get-ActionInputContext
      $windowMessagePointer = Use-WindowMessagePointerInput $context
      if (-not $windowMessagePointer) {
        Set-DesktopCursor $x $y
        for ($click = 1; $click -le $count; $click++) { Send-MouseButton $button $true; Send-MouseButton $button $false; if ($click -lt $count) { Start-Sleep -Milliseconds 40 } }
      } else {
        $script:lastInputMode = if ($context.foreground) { "window-message-dpi" } else { "window-message" }
        if ($count -eq 2) { Send-WindowMouseButton $context.window $button $true $x $y }
        else { for ($click = 1; $click -le $count; $click++) { Send-WindowMouseButton $context.window $button $false $x $y; if ($click -lt $count) { Start-Sleep -Milliseconds 40 } } }
      }
      $clientPoint = Convert-ScreenPointToClient $context.window $x $y
      return [ordered] @{ x = $x; y = $y; button = $button; count = $count; clientX = $clientPoint.X; clientY = $clientPoint.Y }
    }
    "move" {
      $x = Assert-Integer (Get-OptionalProperty $Action "x") "MOVE_X" -100000 100000; $y = Assert-Integer (Get-OptionalProperty $Action "y") "MOVE_Y" -100000 100000
      $context = Get-ActionInputContext
      # Hover is cursor state, not a button command. Moving the real desktop cursor is required
      # so Chromium performs native hit testing and emits pointerenter/pointermove even when
      # foreground activation was denied and click/key actions must use window messages.
      Set-DesktopCursor $x $y
      Send-WindowMouseMove $context.window $x $y
      $script:lastInputMode = if ($context.foreground) { "foreground-cursor" } else { "desktop-cursor" }
      $clientPoint = Convert-ScreenPointToClient $context.window $x $y
      $cursor = Get-DesktopCursor
      return [ordered] @{ x = $x; y = $y; cursorX = $cursor.x; cursorY = $cursor.y; clientX = $clientPoint.X; clientY = $clientPoint.Y }
    }
    "doubleclick" { $doubleButton = Get-OptionalProperty $Action "button"; return Invoke-CoordinateAction ([pscustomobject]@{ op = "click"; x = (Get-OptionalProperty $Action "x"); y = (Get-OptionalProperty $Action "y"); button = $doubleButton; count = 2 }) $Index }
    "rightclick" { return Invoke-CoordinateAction ([pscustomobject]@{ op = "click"; x = (Get-OptionalProperty $Action "x"); y = (Get-OptionalProperty $Action "y"); button = "right"; count = 1 }) $Index }
    "drag" {
      $from = Get-Point (Get-OptionalProperty $Action "from") "DRAG_FROM"; $to = Get-Point (Get-OptionalProperty $Action "to") "DRAG_TO"
      $declaredButton = Get-OptionalProperty $Action "button"; $button = if ($null -eq $declaredButton) { "left" } else { [string] $declaredButton }
      $declaredDuration = Get-OptionalProperty $Action "durationMs"; $duration = if ($null -eq $declaredDuration) { 250 } else { Assert-Integer $declaredDuration "DRAG_DURATION" 0 10000 }
      $context = Get-ActionInputContext
      $windowMessages = Resolve-WindowMouseMessages $button
      $windowMessagePointer = Use-WindowMessagePointerInput $context
      if (-not $windowMessagePointer) { Set-DesktopCursor $from.x $from.y; Send-MouseButton $button $true }
      else { Send-WindowMouseMove $context.window $from.x $from.y; Send-WindowMessage $context.window ([uint32]$windowMessages.down) ([IntPtr]$windowMessages.mask) (Convert-PointLParam (Convert-ScreenPointToClient $context.window $from.x $from.y).X (Convert-ScreenPointToClient $context.window $from.x $from.y).Y) }
      $steps = [Math]::Max(1, [Math]::Ceiling($duration / 25))
      for ($step = 1; $step -le $steps; $step++) { $ratio = $step / $steps; $moveX = [int] [Math]::Round($from.x + (($to.x - $from.x) * $ratio)); $moveY = [int] [Math]::Round($from.y + (($to.y - $from.y) * $ratio)); if (-not $windowMessagePointer) { Set-DesktopCursor $moveX $moveY } else { Send-WindowMouseMove $context.window $moveX $moveY ([uint32]$windowMessages.mask) }; if ($duration -gt 0) { Start-Sleep -Milliseconds ([int] [Math]::Max(1, $duration / $steps)) } }
      if (-not $windowMessagePointer) { Send-MouseButton $button $false }
      else { $clientTo = Convert-ScreenPointToClient $context.window $to.x $to.y; Send-WindowMessage $context.window ([uint32]$windowMessages.up) ([IntPtr]::Zero) (Convert-PointLParam $clientTo.X $clientTo.Y) }
      if ($windowMessagePointer) { $script:lastInputMode = if ($context.foreground) { "window-message-dpi" } else { "window-message" } }
      return [ordered] @{ from = $from; to = $to; button = $button; durationMs = $duration }
    }
    "scroll" {
      $declaredDx = Get-OptionalProperty $Action "dx"; $declaredDy = Get-OptionalProperty $Action "dy"
      $dx = if ($null -eq $declaredDx) { 0 } else { Assert-Integer $declaredDx "SCROLL_DX" -100 100 }; $dy = if ($null -eq $declaredDy) { 0 } else { Assert-Integer $declaredDy "SCROLL_DY" -100 100 }
      $scrollX = Get-OptionalProperty $Action "x"; $scrollY = Get-OptionalProperty $Action "y"
      if ($dx -eq 0 -and $dy -eq 0) { throw "BLD052_SCROLL_EMPTY" }
      $context = Get-ActionInputContext
      $windowMessagePointer = Use-WindowMessagePointerInput $context
      if (-not $windowMessagePointer) {
        if ($null -ne $scrollX -and $null -ne $scrollY) { Set-DesktopCursor (Assert-Integer $scrollX "SCROLL_X" -100000 100000) (Assert-Integer $scrollY "SCROLL_Y" -100000 100000) }
        if ($dx -eq 0 -and $dy -eq 0) { throw "BLD052_SCROLL_EMPTY" }
        if ($dy -ne 0) { Send-Inputs ([Bld052.Native+INPUT[]] @(New-InputMouse ([Bld052.Native]::MOUSEEVENTF_WHEEL) (Convert-WheelData ($dy * 120)))) }
        if ($dx -ne 0) { Send-Inputs ([Bld052.Native+INPUT[]] @(New-InputMouse ([Bld052.Native]::MOUSEEVENTF_HWHEEL) (Convert-WheelData ($dx * 120)))) }
      } else {
        $script:lastInputMode = if ($context.foreground) { "window-message-dpi" } else { "window-message" }
        $wheelX = if ($null -eq $scrollX) { $context.rect.left + [int]($context.rect.width / 2) } else { [int]$scrollX }; $wheelY = if ($null -eq $scrollY) { $context.rect.top + [int]($context.rect.height / 2) } else { [int]$scrollY }
        Send-WindowWheel $context.window $wheelX $wheelY $dx $dy
      }
      return [ordered] @{ dx = $dx; dy = $dy }
    }
    "key" {
      $key = [string] (Get-OptionalProperty $Action "key")
      $context = Get-ActionInputContext
      $windowMessageKeyboard = Use-WindowMessagePointerInput $context
      if ($context.foreground -and -not $windowMessageKeyboard) { Send-KeyChord $key }
      else {
        $script:lastInputMode = if ($context.foreground) { "window-message-dpi" } else { "window-message" }
        Send-WindowKeyChord $context.window $key
      }
      return [ordered] @{ key = $key.ToUpperInvariant() }
    }
    "type" {
      $text = [string] (Get-OptionalProperty $Action "text")
      $context = Get-ActionInputContext
      $windowMessageKeyboard = Use-WindowMessagePointerInput $context
      if ($context.foreground -and -not $windowMessageKeyboard) { Send-UnicodeText $text }
      else {
        $script:lastInputMode = if ($context.foreground) { "window-message-dpi" } else { "window-message" }
        Send-WindowUnicodeText $context.window $text
      }
      return [ordered] @{ textLength = $text.Length; textSha256 = "sha256:$(Get-StringHash $text)" }
    }
    "wait" { $milliseconds = Assert-Integer (Get-OptionalProperty $Action "milliseconds") "WAIT_MILLISECONDS" 0 30000; Wait-Bounded $milliseconds; return [ordered] @{ milliseconds = $milliseconds } }
    "resize" {
      if ($null -eq $script:process) { throw "BLD052_LAUNCH_REQUIRED" }
      $window = Wait-ForMainWindow $script:process $deadline; $width = Assert-Integer (Get-OptionalProperty $Action "width") "RESIZE_WIDTH" 320 10000; $height = Assert-Integer (Get-OptionalProperty $Action "height") "RESIZE_HEIGHT" 240 10000
      if (-not [Bld052.Native]::SetWindowPos($window, [IntPtr]::Zero, 0, 0, $width, $height, [Bld052.Native]::SWP_NOMOVE -bor [Bld052.Native]::SWP_NOZORDER -bor [Bld052.Native]::SWP_NOACTIVATE)) { throw "BLD052_RESIZE_FAILED" }
      $script:lastInputMode = "window-control"; $script:lastWindowHandle = $window
      return [ordered] @{ width = $width; height = $height }
    }
    "close" {
      if ($null -eq $script:process) { return [ordered] @{ closed = $false } }
      $window = Get-MainWindow $script:process; if ($null -ne $window) { [Bld052.Native]::PostMessage($window, [Bld052.Native]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null }
      $script:lastInputMode = "window-message"; $script:lastWindowHandle = $window
      $script:closed = $true; return [ordered] @{ closeRequested = $true }
    }
    default { throw "BLD052_ACTION_UNSUPPORTED:$operation" }
  }
}

try {
  for ($index = 0; $index -lt $actions.Count; $index++) {
    if ([datetime]::UtcNow -ge $deadline) { throw "BLD052_TIMEOUT" }
    $sequence = $index + 1; $action = $actions[$index]; $operation = Get-ActionOperation $action; $started = [datetime]::UtcNow
    $script:lastInputMode = "none"
    $script:lastWindowHandle = [IntPtr]::Zero
    $preActionWindow = [IntPtr]::Zero
    $preActionRect = $null
    if ($null -ne $script:process) {
      try {
        $preActionWindow = Get-MainWindow $script:process
        if ($null -ne $preActionWindow) { $preActionRect = Get-WindowRectMetadata $preActionWindow }
      } catch { $preActionWindow = [IntPtr]::Zero; $preActionRect = $null }
    }
    $result = $null; $screenshot = $null; $actionError = $null; $resultStatus = "PASS"
    try {
      $result = Invoke-CoordinateAction $action $sequence
      $declaredLabel = Get-OptionalProperty $action "label"; $screenshotLabel = if ($null -eq $declaredLabel) { $operation } else { [string] $declaredLabel }; $screenshot = Capture-ActionScreenshot $sequence $screenshotLabel
    } catch {
      $resultStatus = "FAIL"; $actionError = $_.Exception.Message
      try { $screenshot = Capture-ActionScreenshot $sequence "error-$operation" } catch { }
      throw
    } finally {
      $interaction = [ordered] @{ inputMode = $script:lastInputMode }
      if ($script:lastWindowHandle -eq [IntPtr]::Zero -and $preActionWindow -ne [IntPtr]::Zero) { $script:lastWindowHandle = $preActionWindow }
      if ($script:lastWindowHandle -ne [IntPtr]::Zero) {
        $interaction.windowHandle = $script:lastWindowHandle.ToInt64()
        try { $interaction.windowRect = Get-WindowRectMetadata $script:lastWindowHandle } catch { $interaction.windowRect = $preActionRect }
      }
      $metadata = Convert-TranscriptValue $result
      if ($null -eq $metadata) { $metadata = [ordered] @{} }
      if (-not ($metadata -is [System.Collections.IDictionary])) { $metadata = [ordered] @{ value = $metadata } }
      $metadata.inputMode = $interaction.inputMode
      if ($interaction.Contains("windowHandle")) { $metadata.windowHandle = $interaction.windowHandle; $metadata.windowRect = $interaction.windowRect }
      $record = [ordered] @{
        schema = "rsrender.bld052.action.v1"; sequence = $sequence; operation = $operation; workflow = $workflow; persona = $persona; startedAtUtc = $started.ToString("o"); completedAtUtc = [datetime]::UtcNow.ToString("o"); result = $resultStatus; metadata = $metadata; screenshot = $screenshot
      }
      if ($null -ne $actionError) { $record.error = $actionError }
      Write-Transcript $record; $outcomes += $record
    }
  }
} catch {
  $failure = $_.Exception.Message
  # Escape is the only emergency input; cleanup then acts only on our job.
  if ($null -ne $process) {
    try {
      $emergencyWindow = Get-MainWindow $process
      if ($null -ne $emergencyWindow) { [Bld052.Native]::SetForegroundWindow($emergencyWindow) | Out-Null; Send-KeyChord "ESC" }
    } catch { }
  }
  $script:runFailure = $failure
} finally {
  if ($null -ne $process -and -not $KeepOpen) {
    try {
      $window = Get-MainWindow $process; if ($null -ne $window) { [Bld052.Native]::PostMessage($window, [Bld052.Native]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null }
      $process.WaitForExit(3000) | Out-Null
    } catch { }
    if (-not $process.HasExited) { Stop-LaunchedRootOnly }
  }
  if ($job -ne [IntPtr]::Zero -and -not $KeepOpen) { [Bld052.Native]::TerminateAndCloseJob($job); $job = [IntPtr]::Zero }
}

$summaryResult = if ($null -eq $script:runFailure) { "PASS" } else { "FAIL" }
$summary = [ordered] @{
  schema = "rsrender.bld052.coordinate-driver-summary.v1"; ticket = "BLD-052 / GitHub #95"; result = $summaryResult; startedAtUtc = $runStarted.ToString("o"); completedAtUtc = [datetime]::UtcNow.ToString("o"); actionCount = $outcomes.Count; maxActions = $MaxActions; timeoutSeconds = $TimeoutSeconds; syntheticDataOnly = $true; coordinateOnly = $true; workflow = $workflow; persona = $persona; executable = [ordered] @{ path = $executable; sha256 = "sha256:$executableHash"; bytes = (Get-Item -LiteralPath $executable).Length }; sourceDigests = $sourceDigests; transcript = [System.IO.Path]::GetFileName($transcriptPath); screenshots = @($outcomes | Where-Object { $null -ne $_.screenshot } | ForEach-Object { $_.screenshot.path; if ($null -ne $_.screenshot.window) { $_.screenshot.window.path } })
}
if ($null -ne $script:runFailure) { $summary.error = $script:runFailure }
$summary | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $summaryPath -Encoding UTF8
if ($null -ne $script:runFailure) { throw $script:runFailure }
Write-Output ($summary | ConvertTo-Json -Depth 12 -Compress)
