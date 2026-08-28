#!/usr/bin/env python3
"""
Optional background-input bridge for the FFXIV Raid Companion (Linux).

Browsers only deliver gamepad input to a focused window, so this script reads
your controller straight from /dev/input and forwards button presses to the
web app over a small WebSocket server. Run it while playing:

    python3 gamepad_relay.py                     # then open index.html normally
    python3 gamepad_relay.py --guide-button 9    # if the app expects slot 9

No third-party packages required (Python 3 standard library only). The web app
auto-connects and retries, so you can start/stop this script at any time.

Windows note: there is no /dev/input on Windows; use the native polling path
in the browser instead (it works while the browser window itself is focused),
or port this script to pywin32 Raw Input + a WebSocket server.
"""

import base64
import fcntl
import hashlib
import json
import os
import select
import socket
import struct
import sys

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
WEB_HOST = "127.0.0.1"
WEB_PORT = 8765

# evdev key code -> standard gamepad button index sent to the web app.
# XInput (Xbox) controllers on Linux report the Guide/Home button as
# KEY_MICMUTE (113). The value must match the app's CONFIG.RESET_BUTTON_INDEX
# (slot 16 in this setup), otherwise relayed presses are not treated as the
# control button. Override with: python3 gamepad_relay.py --guide-button N
GUIDE_BUTTON = 16
for _i, _arg in enumerate(sys.argv[1:], start=1):
    if _arg == "--guide-button" and _i + 1 < len(sys.argv):
        GUIDE_BUTTON = int(sys.argv[_i + 1])

KEY_TO_BUTTON = {
    113: GUIDE_BUTTON,   # KEY_MICMUTE -> Xbox Guide/Home
}

# Only watch devices whose name contains one of these substrings (case-
# insensitive). Empty list = watch every readable /dev/input/event* device.
ONLY_DEVICES = []          # e.g. ["Xbox", "DualSense"]
# ---------------------------------------------------------------------------


EV_KEY = 1
EVENT_FMT = "<llHHi"       # struct input_event on x86_64 Linux (24 bytes)
EVENT_SIZE = struct.calcsize(EVENT_FMT)
EVIOCGNAME = 0x40214506    # EVIOCGNAME(33)


def device_name(fd):
    try:
        buf = fcntl.ioctl(fd, EVIOCGNAME, b"\x00" * 33)
        return buf.split(b"\x00")[0].decode(errors="replace")
    except OSError:
        return ""


def open_devices():
    devs = []
    for name in sorted(os.listdir("/dev/input")):
        if not name.startswith("event"):
            continue
        path = "/dev/input/" + name
        try:
            fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK)
        except OSError:
            continue  # no permission / vanished
        devname = device_name(fd)
        if ONLY_DEVICES and not any(s.lower() in devname.lower() for s in ONLY_DEVICES):
            os.close(fd)
            continue
        devs.append((fd, path, devname))
    return devs


# ------------------------- minimal WebSocket server ------------------------

def ws_handshake(conn):
    data = b""
    while b"\r\n\r\n" not in data:
        chunk = conn.recv(4096)
        if not chunk:
            return False
        data += chunk
    key = None
    for line in data.split(b"\r\n"):
        if line.lower().startswith(b"sec-websocket-key:"):
            key = line.split(b":", 1)[1].strip()
    if key is None:
        return False
    accept = base64.b64encode(
        hashlib.sha1(key + b"258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest()
    ).decode()
    conn.sendall((
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
    ).encode())
    return True


def recv_exact(conn, n):
    buf = b""
    while len(buf) < n:
        chunk = conn.recv(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf


def read_frame(conn):
    """Returns (opcode, payload); (None, None) on close/error."""
    header = recv_exact(conn, 2)
    if not header:
        return None, None
    opcode = header[0] & 0x0F
    length = header[1] & 0x7F
    masked = bool(header[1] & 0x80)
    if length == 126:
        b = recv_exact(conn, 2)
        if not b:
            return None, None
        length = struct.unpack(">H", b)[0]
    elif length == 127:
        b = recv_exact(conn, 8)
        if not b:
            return None, None
        length = struct.unpack(">Q", b)[0]
    mask = recv_exact(conn, 4) if masked else b""
    payload = recv_exact(conn, length) if length else b""
    if payload is None:
        return None, None
    if masked and payload:
        payload = bytes(c ^ mask[i % 4] for i, c in enumerate(payload))
    return opcode, payload


def send_json(conn, obj):
    payload = json.dumps(obj).encode()
    if len(payload) < 126:
        header = bytes([0x81, len(payload)])
    else:
        header = b"\x81\x7e" + struct.pack(">H", len(payload))
    try:
        conn.sendall(header + payload)
    except OSError:
        pass


# --------------------------------- main ------------------------------------

def broadcast(clients, obj):
    for conn in clients:
        send_json(conn, obj)


def main():
    devs = open_devices()
    if not devs:
        sys.exit("No readable /dev/input/event* devices found. "
                 "Are you in the 'input' group (sg input)?")

    print("Watching devices:")
    for fd, path, devname in devs:
        print(f"  {path}  ({devname})")

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((WEB_HOST, WEB_PORT))
    server.listen(4)
    server.setblocking(False)
    print(f"WebSocket relay listening on ws://{WEB_HOST}:{WEB_PORT}  (Ctrl+C to stop)")

    clients = []          # accepted browser connections
    last_state = {}       # (fd, code) -> bool (was the key down?)

    while True:
        ready, _, _ = select.select(
            [server] + [d[0] for d in devs] + clients, [], [])

        if server in ready:
            conn, _addr = server.accept()
            try:
                if ws_handshake(conn):
                    clients.append(conn)
                    print("Browser connected")
                else:
                    conn.close()
            except OSError:
                conn.close()

        for fd, path, _devname in devs:
            if fd not in ready:
                continue
            while True:
                try:
                    raw = os.read(fd, 256)
                except BlockingIOError:
                    break
                if not raw:
                    break
                for off in range(0, len(raw), EVENT_SIZE):
                    if off + EVENT_SIZE > len(raw):
                        break
                    _sec, _usec, etype, code, value = struct.unpack_from(EVENT_FMT, raw, off)
                    if etype != EV_KEY or code not in KEY_TO_BUTTON:
                        continue
                    button = KEY_TO_BUTTON[code]
                    was_down = last_state.get((fd, code), False)
                    is_down = bool(value)
                    last_state[(fd, code)] = is_down
                    if is_down and not was_down:  # rising edge only
                        broadcast(clients, {"button": button, "pressed": True})

        for conn in list(clients):
            if conn not in ready:
                continue
            opcode, _payload = read_frame(conn)
            if opcode is None or opcode == 8:  # error or close frame
                clients.remove(conn)
                try:
                    conn.close()
                except OSError:
                    pass
                print("Browser disconnected")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped.")
