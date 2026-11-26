"""Store document files, encrypted by us before they're written anywhere.

Two places they can go:
  * R2 / any S3-compatible store, when S3_ACCESS_KEY_ID etc. are set (for going live)
  * a folder on this computer (LOCAL_STORAGE_DIR), when they're not, so saving
    photos works in development without any cloud account

Either way the bytes are AES-GCM encrypted with the file's key as associated data,
so a copied file is useless without ENCRYPTION_KEYS and can't be swapped for another.
"""
import re
import uuid
from functools import lru_cache
from pathlib import Path

from app.config import get_settings
from app.core.crypto import get_keyring

_KEY_RE = re.compile(r"^u/[0-9a-f-]{36}/[0-9a-f-]{36}$")


def using_s3() -> bool:
    s = get_settings()
    return bool(s.s3_access_key_id and s.s3_secret_access_key and s.s3_endpoint_url and "<" not in s.s3_endpoint_url)


@lru_cache
def _client():
    import boto3

    s = get_settings()
    return boto3.client("s3", endpoint_url=s.s3_endpoint_url, aws_access_key_id=s.s3_access_key_id,
                        aws_secret_access_key=s.s3_secret_access_key, region_name=s.s3_region)


def _local_path(key: str) -> Path:
    if not _KEY_RE.match(key):  # keys are only ever made by new_key(); refuse anything else
        raise ValueError("bad storage key")
    base = Path(get_settings().local_storage_dir).resolve()
    return base / key


def new_key(user_id: uuid.UUID) -> str:
    return f"u/{user_id}/{uuid.uuid4()}"


def put_encrypted(key: str, data: bytes) -> None:
    blob = get_keyring().encrypt(data, associated_data=key.encode())
    if using_s3():
        _client().put_object(Bucket=get_settings().s3_bucket, Key=key, Body=blob,
                             ContentType="application/octet-stream")
        return
    path = _local_path(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(blob)


def get_decrypted(key: str) -> bytes:
    if using_s3():
        blob = _client().get_object(Bucket=get_settings().s3_bucket, Key=key)["Body"].read()
    else:
        blob = _local_path(key).read_bytes()
    return get_keyring().decrypt(blob, associated_data=key.encode())


def delete(key: str) -> None:
    if using_s3():
        _client().delete_object(Bucket=get_settings().s3_bucket, Key=key)
    else:
        _local_path(key).unlink(missing_ok=True)


def delete_prefix(prefix: str) -> None:
    """Used for full account deletion."""
    s = get_settings()
    if using_s3():
        paginator = _client().get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=s.s3_bucket, Prefix=prefix):
            keys = [{"Key": o["Key"]} for o in page.get("Contents", [])]
            if keys:
                _client().delete_objects(Bucket=s.s3_bucket, Delete={"Objects": keys})
        return
    folder = Path(s.local_storage_dir).resolve() / prefix
    if folder.is_dir() and folder.resolve().is_relative_to(Path(s.local_storage_dir).resolve()):
        for f in folder.glob("*"):
            f.unlink(missing_ok=True)
        folder.rmdir()
