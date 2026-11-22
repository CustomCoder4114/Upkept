"""Upload/download document files to R2 (or any S3-compatible store).

Files are encrypted by us before upload (on top of R2's own at-rest encryption),
so a leaked bucket key alone doesn't expose anyone's passport.
"""
import uuid
from functools import lru_cache

from app.config import get_settings
from app.core.crypto import get_keyring


@lru_cache
def _client():
    import boto3

    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=s.s3_endpoint_url,
        aws_access_key_id=s.s3_access_key_id,
        aws_secret_access_key=s.s3_secret_access_key,
        region_name=s.s3_region,
    )


def new_key(user_id: uuid.UUID) -> str:
    return f"u/{user_id}/{uuid.uuid4()}"


def put_encrypted(key: str, data: bytes) -> None:
    blob = get_keyring().encrypt(data, associated_data=key.encode())
    _client().put_object(Bucket=get_settings().s3_bucket, Key=key, Body=blob,
                         ContentType="application/octet-stream")


def get_decrypted(key: str) -> bytes:
    obj = _client().get_object(Bucket=get_settings().s3_bucket, Key=key)
    return get_keyring().decrypt(obj["Body"].read(), associated_data=key.encode())


def delete(key: str) -> None:
    _client().delete_object(Bucket=get_settings().s3_bucket, Key=key)


def delete_prefix(prefix: str) -> None:
    """Used for full account deletion."""
    s = get_settings()
    paginator = _client().get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=s.s3_bucket, Prefix=prefix):
        keys = [{"Key": o["Key"]} for o in page.get("Contents", [])]
        if keys:
            _client().delete_objects(Bucket=s.s3_bucket, Delete={"Objects": keys})
