from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid
import os
from PIL import Image
from io import BytesIO
from .. import crud, schemas, database, utils

router = APIRouter()

# ── QR Code ───────────────────────────────────────────────────────────────────

@router.get("/boxes/{box_id}/qrcode")
async def get_box_qrcode(box_id: int, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.get_box(db, box_id=box_id)
    if db_box is None:
        raise HTTPException(status_code=404, detail="Box not found")
    qr_data = f"/hassio/ingress/whereisit/#/box/{db_box.slug}"
    img_bytes = utils.generate_qr_code(qr_data)
    return Response(content=img_bytes, media_type="image/png")

# ── Units ─────────────────────────────────────────────────────────────────────

@router.post("/units", response_model=schemas.UnitResponse)
async def create_unit(unit: schemas.UnitCreate, db: AsyncSession = Depends(database.get_db)):
    db_unit = await crud.create_unit(db=db, unit=unit)
    return {"id": db_unit.id, "name": db_unit.name, "description": db_unit.description}

@router.get("/units", response_model=List[schemas.Unit])
async def read_units(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(database.get_db)):
    return await crud.get_units(db, skip=skip, limit=limit)

@router.get("/units/{unit_id}", response_model=schemas.Unit)
async def read_unit(unit_id: int, db: AsyncSession = Depends(database.get_db)):
    db_unit = await crud.get_unit(db, unit_id=unit_id)
    if db_unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    return db_unit

@router.put("/units/{unit_id}", response_model=schemas.UnitResponse)
async def update_unit(unit_id: int, unit_update: schemas.UnitUpdate, db: AsyncSession = Depends(database.get_db)):
    db_unit = await crud.update_unit(db, unit_id=unit_id, unit_update=unit_update)
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"id": db_unit.id, "name": db_unit.name, "description": db_unit.description}

@router.delete("/units/{unit_id}")
async def delete_unit(unit_id: int, db: AsyncSession = Depends(database.get_db)):
    db_unit = await crud.delete_unit(db, unit_id=unit_id)
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"message": "Unit deleted successfully"}

# ── Locations ─────────────────────────────────────────────────────────────────

@router.get("/locations", response_model=List[schemas.LocationSummary])
async def read_locations(db: AsyncSession = Depends(database.get_db)):
    locs = await crud.get_locations(db)
    return [{"id": l.id, "name": l.name, "description": l.description, "unit_id": l.unit_id} for l in locs]

@router.post("/locations", response_model=schemas.LocationSummary)
async def create_location(location: schemas.LocationCreate, db: AsyncSession = Depends(database.get_db)):
    db_loc = await crud.create_location(db=db, location=location)
    return {"id": db_loc.id, "name": db_loc.name, "description": db_loc.description, "unit_id": db_loc.unit_id}

@router.get("/locations/{location_id}", response_model=schemas.LocationWithBoxes)
async def read_location(location_id: int, db: AsyncSession = Depends(database.get_db)):
    db_loc = await crud.get_location(db, location_id=location_id)
    if db_loc is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return db_loc

@router.put("/locations/{location_id}", response_model=schemas.LocationSummary)
async def update_location(location_id: int, location_update: schemas.LocationUpdate, db: AsyncSession = Depends(database.get_db)):
    db_loc = await crud.update_location(db, location_id=location_id, location_update=location_update)
    if not db_loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"id": db_loc.id, "name": db_loc.name, "description": db_loc.description, "unit_id": db_loc.unit_id}

@router.delete("/locations/{location_id}")
async def delete_location(location_id: int, db: AsyncSession = Depends(database.get_db)):
    db_loc = await crud.delete_location(db, location_id=location_id)
    if not db_loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Location deleted successfully"}

# ── Boxes ─────────────────────────────────────────────────────────────────────

@router.post("/boxes", response_model=schemas.BoxSummary)
async def create_box(box: schemas.BoxCreate, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.create_box(db=db, box=box)
    return {"id": db_box.id, "name": db_box.name, "description": db_box.description, "slug": db_box.slug, "location_id": db_box.location_id}

@router.put("/boxes/{box_id}", response_model=schemas.BoxSummary)
async def update_box(box_id: int, box_update: schemas.BoxUpdate, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.update_box(db, box_id=box_id, box_update=box_update)
    if not db_box:
        raise HTTPException(status_code=404, detail="Box not found")
    return {"id": db_box.id, "name": db_box.name, "description": db_box.description, "slug": db_box.slug, "location_id": db_box.location_id}

@router.delete("/boxes/{box_id}")
async def delete_box(box_id: int, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.delete_box(db, box_id=box_id)
    if not db_box:
        raise HTTPException(status_code=404, detail="Box not found")
    return {"message": "Box deleted successfully"}

@router.get("/boxes/{box_id}", response_model=schemas.Box)
async def read_box(box_id: int, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.get_box(db, box_id=box_id)
    if db_box is None:
        raise HTTPException(status_code=404, detail="Box not found")
    return db_box

@router.get("/boxes/slug/{slug}", response_model=schemas.Box)
async def read_box_by_slug(slug: str, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.get_box_by_slug(db, slug=slug)
    if db_box is None:
        raise HTTPException(status_code=404, detail="Box not found")
    return db_box

# ── Move: Box ─────────────────────────────────────────────────────────────────

@router.patch("/boxes/{box_id}/move", response_model=schemas.BoxSummary)
async def move_box(box_id: int, body: schemas.MoveBoxRequest, db: AsyncSession = Depends(database.get_db)):
    """Move a box to a different location. Slug, QR code and photos are unchanged."""
    db_loc = await crud.get_location(db, body.target_location_id)
    if not db_loc:
        raise HTTPException(status_code=404, detail="Target location not found")
    db_box = await crud.move_box(db, box_id=box_id, target_location_id=body.target_location_id)
    if not db_box:
        raise HTTPException(status_code=404, detail="Box not found")
    return {"id": db_box.id, "name": db_box.name, "description": db_box.description, "slug": db_box.slug, "location_id": db_box.location_id}

# ── Move: Items ───────────────────────────────────────────────────────────────

@router.patch("/boxes/{box_id}/move-items")
async def move_items(box_id: int, body: schemas.MoveItemsRequest, db: AsyncSession = Depends(database.get_db)):
    """Move selected items from this box to another box."""
    if box_id == body.target_box_id:
        raise HTTPException(status_code=400, detail="Source and target box are the same")
    target = await crud.get_box(db, body.target_box_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target box not found")
    moved = await crud.move_items(db, source_box_id=box_id, item_ids=body.item_ids, target_box_id=body.target_box_id)
    return {"moved_item_ids": moved, "target_box_id": body.target_box_id}

@router.post("/boxes/{box_id}/merge")
async def merge_box(box_id: int, body: schemas.MergeBoxRequest, db: AsyncSession = Depends(database.get_db)):
    """Move ALL items from this box into another box, optionally deleting the source."""
    if box_id == body.target_box_id:
        raise HTTPException(status_code=400, detail="Cannot merge a box with itself")
    target = await crud.get_box(db, body.target_box_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target box not found")
    count = await crud.merge_box(db, source_box_id=box_id, target_box_id=body.target_box_id, delete_source=body.delete_source)
    return {"merged_count": count, "target_box_id": body.target_box_id, "source_deleted": body.delete_source}

# ── Flat box list (for move-items picker) ─────────────────────────────────────

@router.get("/boxes-flat", response_model=List[schemas.BoxFlat])
async def list_boxes_flat(db: AsyncSession = Depends(database.get_db)):
    """Return all boxes with unit/location context for dropdown pickers."""
    boxes = await crud.get_boxes(db)
    result = []
    for b in boxes:
        loc = b.location
        unit = loc.unit if loc else None
        result.append({
            "id": b.id,
            "name": b.name,
            "slug": b.slug,
            "location_id": b.location_id,
            "location_name": loc.name if loc else "",
            "unit_name": unit.name if unit else "",
        })
    return result

# ── Items ─────────────────────────────────────────────────────────────────────

@router.post("/boxes/{box_id}/items", response_model=schemas.Item)
async def create_item(box_id: int, item: schemas.ItemCreate, db: AsyncSession = Depends(database.get_db)):
    return await crud.create_item(db=db, item=item, box_id=box_id)

@router.put("/items/{item_id}", response_model=schemas.Item)
async def update_item(item_id: int, item_update: schemas.ItemUpdate, db: AsyncSession = Depends(database.get_db)):
    db_item = await crud.update_item(db, item_id=item_id, item_update=item_update)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    return db_item

@router.delete("/items/{item_id}")
async def delete_item(item_id: int, db: AsyncSession = Depends(database.get_db)):
    db_item = await crud.delete_item(db, item_id=item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@router.post("/items/{item_id}/photo", response_model=schemas.Item)
async def upload_item_photo(item_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(database.get_db)):
    from sqlalchemy.future import select
    from .. import models

    result = await db.execute(select(models.Item).where(models.Item.id == item_id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        contents = await file.read()
        image = Image.open(BytesIO(contents))
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        image.thumbnail((800, 800))
        filename = f"{uuid.uuid4()}.jpg"
        filepath = os.path.join("/data/photos", filename)
        image.save(filepath, format="JPEG", quality=85)
        photo_url = f"/api/photos/{filename}"
        update_data = schemas.ItemUpdate(photo_path=photo_url)
        return await crud.update_item(db, item_id=item_id, item_update=update_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

# ── Categories ────────────────────────────────────────────────────────────────

@router.post("/categories")
async def create_category(category: schemas.CategoryCreate, db: AsyncSession = Depends(database.get_db)):
    if not category.name or not category.name.strip():
        raise HTTPException(status_code=400, detail="Category name cannot be empty")
    result = await crud.create_category(db, category.name.strip())
    if result is None:
        raise HTTPException(status_code=409, detail="Category already exists")
    return {"message": f"Category '{category.name.strip()}' created"}

@router.get("/categories", response_model=List[str])
async def read_categories(db: AsyncSession = Depends(database.get_db)):
    return await crud.get_categories(db)

@router.put("/categories/{old_name}")
async def rename_category(old_name: str, new_name: str, db: AsyncSession = Depends(database.get_db)):
    if not new_name or not new_name.strip():
        raise HTTPException(status_code=400, detail="New category name cannot be empty")
    await crud.rename_category(db, old_name, new_name.strip())
    return {"message": f"Category '{old_name}' renamed to '{new_name.strip()}'"}

@router.delete("/categories/{category_name}")
async def delete_category(category_name: str, db: AsyncSession = Depends(database.get_db)):
    await crud.delete_category(db, category_name)
    return {"message": f"Category '{category_name}' removed from all items"}

# ── Search ────────────────────────────────────────────────────────────────────

@router.get("/search")
async def search(q: str = "", category: str = None, db: AsyncSession = Depends(database.get_db)):
    return await crud.search_storage(db, query=q, category=category)


# ── Backup & Restore ──────────────────────────────────────────────────────────

import zipfile
import csv
import io
import shutil
import tempfile
from fastapi import Form
from fastapi.responses import StreamingResponse

DB_PATH = "/data/whereisit.db"
PHOTOS_DIR = "/data/photos"

@router.get("/backup/full", summary="Download full backup (DB + photos)")
async def backup_full():
    """Returns a zip containing whereisit.db + all photos."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        if os.path.exists(DB_PATH):
            zf.write(DB_PATH, "whereisit.db")
        if os.path.exists(PHOTOS_DIR):
            for fname in os.listdir(PHOTOS_DIR):
                fpath = os.path.join(PHOTOS_DIR, fname)
                if os.path.isfile(fpath):
                    zf.write(fpath, f"photos/{fname}")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=whereisit-backup.zip"},
    )

@router.get("/backup/csv", summary="Download CSV export of all data")
async def backup_csv(db: AsyncSession = Depends(database.get_db)):
    """Returns a CSV with all units, locations, boxes and items."""
    units = await crud.get_units(db)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Unit", "Location", "Box", "Box Slug", "Item", "Description", "Quantity", "Category", "Photo"])

    for unit in units:
        for location in unit.locations:
            for box in location.boxes:
                if not box.items:
                    # Write a row for the empty box too
                    writer.writerow([unit.name, location.name, box.name, box.slug, "", "", "", "", ""])
                for item in box.items:
                    writer.writerow([
                        unit.name,
                        location.name,
                        box.name,
                        box.slug,
                        item.name,
                        item.description or "",
                        item.quantity,
                        item.category or "",
                        item.photo_path or "",
                    ])

    buf.seek(0)
    return StreamingResponse(
        io.BytesIO(buf.getvalue().encode("utf-8-sig")),  # utf-8-sig for Excel compatibility
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=whereisit-export.csv"},
    )

@router.post("/restore/full", summary="Restore from a full backup zip")
async def restore_full(file: UploadFile = File(...)):
    """
    Upload a whereisit-backup.zip to restore DB and photos.
    The addon will use the restored DB immediately on next request.
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="File must be a .zip backup")

    contents = await file.read()

    try:
        with zipfile.ZipFile(io.BytesIO(contents)) as zf:
            names = zf.namelist()

            if "whereisit.db" not in names:
                raise HTTPException(status_code=400, detail="Invalid backup: whereisit.db not found in zip")

            # Restore DB — write to temp then move so it's atomic
            tmp_db = DB_PATH + ".restore_tmp"
            with zf.open("whereisit.db") as src, open(tmp_db, "wb") as dst:
                dst.write(src.read())
            os.replace(tmp_db, DB_PATH)

            # Restore photos
            os.makedirs(PHOTOS_DIR, exist_ok=True)
            for name in names:
                if name.startswith("photos/") and not name.endswith("/"):
                    fname = os.path.basename(name)
                    out_path = os.path.join(PHOTOS_DIR, fname)
                    with zf.open(name) as src, open(out_path, "wb") as dst:
                        dst.write(src.read())

    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid or corrupted zip file")

    return {
        "message": "Restore complete. Please restart the addon to fully reload the database.",
        "db_restored": True,
        "photos_restored": len([n for n in names if n.startswith("photos/") and not n.endswith("/")]),
    }
