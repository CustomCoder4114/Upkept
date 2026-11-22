import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_profile_ids, current_user, get_item, get_profile
from app.models import Document, User
from app.schemas import DocumentOut
from app.services import storage

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_BYTES = 15 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/heic", "image/webp", "application/pdf"}
# Magic bytes, so a renamed file can't pretend to be an image.
_SIGNATURES = {b"\xff\xd8\xff": "image/jpeg", b"\x89PNG": "image/png", b"%PDF": "application/pdf",
               b"RIFF": "image/webp"}


def _sniff(data: bytes, declared: str) -> bool:
    if declared == "image/heic":
        return data[4:12] in (b"ftypheic", b"ftypheix", b"ftypmif1", b"ftypmsf1")
    return any(data.startswith(sig) and kind == declared for sig, kind in _SIGNATURES.items())


@router.get("", response_model=list[DocumentOut])
def list_documents(profile_id: uuid.UUID | None = None, item_id: uuid.UUID | None = None,
                   user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(Document).where(Document.profile_id.in_(accessible_profile_ids(db, user)))
    if profile_id:
        q = q.where(Document.profile_id == profile_id)
    if item_id:
        q = q.where(Document.item_id == item_id)
    return db.scalars(q.order_by(Document.created_at.desc())).all()


@router.post("", response_model=DocumentOut, status_code=201)
async def upload(
    file: UploadFile = File(...),
    profile_id: uuid.UUID = Form(...),
    item_id: uuid.UUID | None = Form(None),
    title: str = Form("Document"),
    keep_offline: bool = Form(False),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    get_profile(db, user, profile_id, edit=True)
    version = 1
    if item_id:
        item = get_item(db, user, item_id, edit=True)
        if item.profile_id != profile_id:
            raise HTTPException(400, "Item belongs to a different profile")
        version = (db.scalar(select(func.max(Document.version)).where(Document.item_id == item_id)) or 0) + 1
        for old in db.scalars(select(Document).where(Document.item_id == item_id, Document.is_current.is_(True))):
            old.is_current = False

    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File is larger than 15 MB")
    if file.content_type not in ALLOWED_TYPES or not _sniff(data, file.content_type):
        raise HTTPException(415, "Please upload a photo (JPEG, PNG, HEIC, WebP) or a PDF")

    key = storage.new_key(user.id)
    storage.put_encrypted(key, data)
    doc = Document(profile_id=profile_id, item_id=item_id, title=title[:160], storage_key=key,
                   content_type=file.content_type, size_bytes=len(data), version=version, keep_offline=keep_offline)
    db.add(doc)
    db.flush()
    return doc


def _get_doc(db: Session, user: User, doc_id: uuid.UUID) -> Document:
    doc = db.scalar(select(Document).where(Document.id == doc_id,
                                           Document.profile_id.in_(accessible_profile_ids(db, user))))
    if doc is None:
        raise HTTPException(404, "Document not found")
    return doc


@router.get("/{doc_id}/file")
def download(doc_id: uuid.UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    doc = _get_doc(db, user, doc_id)
    return Response(storage.get_decrypted(doc.storage_key), media_type=doc.content_type,
                    headers={"Cache-Control": "private, no-store"})


@router.patch("/{doc_id}", response_model=DocumentOut)
def set_offline(doc_id: uuid.UUID, keep_offline: bool, user: User = Depends(current_user),
                db: Session = Depends(get_db)):
    doc = _get_doc(db, user, doc_id)
    doc.keep_offline = keep_offline
    return doc


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: uuid.UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    doc = _get_doc(db, user, doc_id)
    get_profile(db, user, doc.profile_id, edit=True)
    storage.delete(doc.storage_key)
    db.delete(doc)
