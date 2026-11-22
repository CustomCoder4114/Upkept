import base64
import os

import pytest
from cryptography.exceptions import InvalidTag

from app.core.crypto import KeyRing, last4


def key() -> str:
    return base64.b64encode(os.urandom(32)).decode()


def test_round_trip():
    ring = KeyRing(f"v1:{key()}")
    blob = ring.encrypt_text("A1234567", associated_data=b"item-1")
    assert b"A1234567" not in blob
    assert ring.decrypt_text(blob, associated_data=b"item-1") == "A1234567"


def test_tampering_is_detected():
    ring = KeyRing(f"v1:{key()}")
    blob = bytearray(ring.encrypt(b"passport"))
    blob[-1] ^= 1
    with pytest.raises(InvalidTag):
        ring.decrypt(bytes(blob))


def test_ciphertext_cant_be_moved_to_another_item():
    ring = KeyRing(f"v1:{key()}")
    blob = ring.encrypt_text("A1234567", associated_data=b"item-1")
    with pytest.raises(InvalidTag):
        ring.decrypt_text(blob, associated_data=b"item-2")


def test_key_rotation_keeps_old_data_readable():
    k1 = key()
    old = KeyRing(f"v1:{k1}").encrypt(b"old")
    ring = KeyRing(f"v2:{key()},v1:{k1}")
    assert ring.decrypt(old) == b"old"
    assert ring.needs_rotation(old)
    assert not ring.needs_rotation(ring.encrypt(b"new"))


def test_bad_keys_are_rejected():
    with pytest.raises(ValueError):
        KeyRing("v1:" + base64.b64encode(b"short").decode())
    with pytest.raises(ValueError):
        KeyRing("")


def test_last4():
    assert last4("4471-208-55") == "0855"
    assert last4("AB1") == "AB1"
