"""Encryption for ID numbers and stored files (AES-256-GCM).

Keys come from ENCRYPTION_KEYS as "v2:base64key,v1:base64key" (newest first).
New data is always encrypted with the newest key; old data stays readable with
older keys, so keys can be rotated without re-encrypting everything at once.

Ciphertext format: b"<version>:" + 12-byte nonce + AES-GCM ciphertext/tag.
"""
import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class KeyRing:
    def __init__(self, spec: str):
        self._keys: dict[str, bytes] = {}
        self._order: list[str] = []
        for part in (p.strip() for p in spec.split(",") if p.strip()):
            version, _, b64 = part.partition(":")
            key = base64.b64decode(b64)
            if len(key) != 32:
                raise ValueError(f"encryption key {version!r} must be 32 bytes")
            if ":" in version or not version:
                raise ValueError("bad key version")
            self._keys[version] = key
            self._order.append(version)
        if not self._order:
            raise ValueError("no encryption keys configured")

    @property
    def current_version(self) -> str:
        return self._order[0]

    def encrypt(self, plaintext: bytes, associated_data: bytes | None = None) -> bytes:
        version = self.current_version
        nonce = os.urandom(12)
        ct = AESGCM(self._keys[version]).encrypt(nonce, plaintext, associated_data)
        return version.encode() + b":" + nonce + ct

    def decrypt(self, blob: bytes, associated_data: bytes | None = None) -> bytes:
        version, sep, rest = blob.partition(b":")
        if not sep:
            raise ValueError("not an encrypted blob")
        key = self._keys.get(version.decode())
        if key is None:
            raise ValueError(f"unknown key version {version!r}")
        nonce, ct = rest[:12], rest[12:]
        return AESGCM(key).decrypt(nonce, ct, associated_data)

    def encrypt_text(self, text: str, associated_data: bytes | None = None) -> bytes:
        return self.encrypt(text.encode(), associated_data)

    def decrypt_text(self, blob: bytes, associated_data: bytes | None = None) -> str:
        return self.decrypt(blob, associated_data).decode()

    def needs_rotation(self, blob: bytes) -> bool:
        return not blob.startswith(self.current_version.encode() + b":")


_keyring: KeyRing | None = None


def get_keyring() -> KeyRing:
    global _keyring
    if _keyring is None:
        from app.config import get_settings

        _keyring = KeyRing(get_settings().encryption_keys)
    return _keyring


def last4(value: str) -> str:
    """What we show in the app instead of the full number: 4471-•••-55 style."""
    cleaned = "".join(ch for ch in value if ch.isalnum())
    return cleaned[-4:] if len(cleaned) >= 4 else cleaned
