from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from . import models, schemas
import uuid

# ── Units ─────────────────────────────────────────────────────────────────────

async def get_units(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.StorageUnit)
        .options(
            selectinload(models.StorageUnit.locations)
            .selectinload(models.Location.boxes)
            .selectinload(models.StorageBox.items)
        )
        .offset(skip).limit(limit)
    )
    return result.scalars().all()

async def get_unit(db: AsyncSession, unit_id: int):
    result = await db.execute(
        select(models.StorageUnit)
        .options(
            selectinload(models.StorageUnit.locations)
            .selectinload(models.Location.boxes)
            .selectinload(models.StorageBox.items)
        )
        .where(models.StorageUnit.id == unit_id)
    )
    return result.scalar_one_or_none()

async def create_unit(db: AsyncSession, unit: schemas.UnitCreate):
    db_unit = models.StorageUnit(name=unit.name, description=unit.description)
    db.add(db_unit)
    await db.commit()
    await db.refresh(db_unit)
    return db_unit

async def update_unit(db: AsyncSession, unit_id: int, unit_update: schemas.UnitUpdate):
    db_unit = await get_unit(db, unit_id)
    if db_unit:
        for key, value in unit_update.model_dump(exclude_unset=True).items():
            setattr(db_unit, key, value)
        await db.commit()
        await db.refresh(db_unit)
    return db_unit

async def delete_unit(db: AsyncSession, unit_id: int):
    db_unit = await get_unit(db, unit_id)
    if db_unit:
        await db.delete(db_unit)
        await db.commit()
    return db_unit

# ── Locations ─────────────────────────────────────────────────────────────────

async def get_locations(db: AsyncSession, skip: int = 0, limit: int = 500):
    result = await db.execute(
        select(models.Location)
        .options(
            selectinload(models.Location.unit),
            selectinload(models.Location.boxes).selectinload(models.StorageBox.items),
        )
        .offset(skip).limit(limit)
    )
    return result.scalars().all()

async def get_location(db: AsyncSession, location_id: int):
    result = await db.execute(
        select(models.Location)
        .options(
            selectinload(models.Location.unit),
            selectinload(models.Location.boxes).selectinload(models.StorageBox.items),
        )
        .where(models.Location.id == location_id)
    )
    return result.scalar_one_or_none()

async def create_location(db: AsyncSession, location: schemas.LocationCreate):
    db_loc = models.Location(
        name=location.name,
        description=location.description,
        unit_id=location.unit_id,
    )
    db.add(db_loc)
    await db.commit()
    await db.refresh(db_loc)
    return db_loc

async def update_location(db: AsyncSession, location_id: int, location_update: schemas.LocationUpdate):
    db_loc = await get_location(db, location_id)
    if db_loc:
        for key, value in location_update.model_dump(exclude_unset=True).items():
            setattr(db_loc, key, value)
        await db.commit()
        await db.refresh(db_loc)
    return db_loc

async def delete_location(db: AsyncSession, location_id: int):
    db_loc = await get_location(db, location_id)
    if db_loc:
        await db.delete(db_loc)
        await db.commit()
    return db_loc

# ── Boxes ─────────────────────────────────────────────────────────────────────

async def get_boxes(db: AsyncSession, skip: int = 0, limit: int = 500):
    result = await db.execute(
        select(models.StorageBox)
        .options(
            selectinload(models.StorageBox.items),
            selectinload(models.StorageBox.location).selectinload(models.Location.unit),
        )
        .offset(skip).limit(limit)
    )
    return result.scalars().all()

async def get_box(db: AsyncSession, box_id: int):
    result = await db.execute(
        select(models.StorageBox)
        .options(selectinload(models.StorageBox.items))
        .where(models.StorageBox.id == box_id)
    )
    return result.scalar_one_or_none()

async def get_box_by_slug(db: AsyncSession, slug: str):
    result = await db.execute(
        select(models.StorageBox)
        .options(selectinload(models.StorageBox.items))
        .where(models.StorageBox.slug == slug)
    )
    return result.scalar_one_or_none()

async def create_box(db: AsyncSession, box: schemas.BoxCreate):
    slug = box.slug or str(uuid.uuid4())
    db_box = models.StorageBox(
        name=box.name,
        description=box.description,
        slug=slug,
        location_id=box.location_id,
    )
    db.add(db_box)
    await db.commit()
    await db.refresh(db_box)
    return db_box

async def update_box(db: AsyncSession, box_id: int, box_update: schemas.BoxUpdate):
    db_box = await get_box(db, box_id)
    if db_box:
        for key, value in box_update.model_dump(exclude_unset=True).items():
            setattr(db_box, key, value)
        await db.commit()
        await db.refresh(db_box)
    return db_box

async def delete_box(db: AsyncSession, box_id: int):
    db_box = await get_box(db, box_id)
    if db_box:
        await db.delete(db_box)
        await db.commit()
    return db_box

async def move_box(db: AsyncSession, box_id: int, target_location_id: int):
    db_box = await get_box(db, box_id)
    if not db_box:
        return None
    db_box.location_id = target_location_id
    await db.commit()
    await db.refresh(db_box)
    return db_box

async def move_items(db: AsyncSession, source_box_id: int, item_ids: list, target_box_id: int):
    moved = []
    for item_id in item_ids:
        result = await db.execute(
            select(models.Item).where(
                models.Item.id == item_id,
                models.Item.box_id == source_box_id
            )
        )
        item = result.scalar_one_or_none()
        if item:
            item.box_id = target_box_id
            moved.append(item_id)
    await db.commit()
    return moved

async def merge_box(db: AsyncSession, source_box_id: int, target_box_id: int, delete_source: bool):
    result = await db.execute(
        select(models.Item).where(models.Item.box_id == source_box_id)
    )
    items = result.scalars().all()
    for item in items:
        item.box_id = target_box_id
    if delete_source:
        src = await get_box(db, source_box_id)
        if src:
            await db.delete(src)
    await db.commit()
    return len(items)

# ── Items ─────────────────────────────────────────────────────────────────────

async def create_item(db: AsyncSession, item: schemas.ItemCreate, box_id: int):
    db_item = models.Item(**item.model_dump(), box_id=box_id)
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

async def update_item(db: AsyncSession, item_id: int, item_update: schemas.ItemUpdate):
    result = await db.execute(select(models.Item).where(models.Item.id == item_id))
    db_item = result.scalar_one_or_none()
    if db_item:
        for key, value in item_update.model_dump(exclude_unset=True).items():
            setattr(db_item, key, value)
        await db.commit()
        await db.refresh(db_item)
    return db_item

async def delete_item(db: AsyncSession, item_id: int):
    result = await db.execute(select(models.Item).where(models.Item.id == item_id))
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()
    return item

# ── Categories ────────────────────────────────────────────────────────────────

async def get_categories(db: AsyncSession):
    result = await db.execute(
        select(models.Item.category).where(models.Item.category.isnot(None))
    )
    item_categories = set()
    for row in result.all():
        if row[0] and row[0].strip():
            for cat in row[0].split(','):
                if cat.strip():
                    item_categories.add(cat.strip())
    result2 = await db.execute(select(models.Category.name))
    standalone_categories = {row[0] for row in result2.all()}
    return sorted(item_categories | standalone_categories)

async def create_category(db: AsyncSession, name: str):
    existing = await db.execute(select(models.Category).where(models.Category.name == name))
    if existing.scalar_one_or_none():
        return None
    db_cat = models.Category(name=name)
    db.add(db_cat)
    await db.commit()
    await db.refresh(db_cat)
    return db_cat

async def rename_category(db: AsyncSession, old_name: str, new_name: str):
    from sqlalchemy import update, or_
    await db.execute(update(models.Category).where(models.Category.name == old_name).values(name=new_name))
    # Handle comma-separated category values in items
    result = await db.execute(select(models.Item).where(
        or_(
            models.Item.category == old_name,
            models.Item.category.like(f"{old_name},%"),
            models.Item.category.like(f"%,{old_name}"),
            models.Item.category.like(f"%,{old_name},%"),
        )
    ))
    items = result.scalars().all()
    for item in items:
        cats = [c.strip() for c in item.category.split(',')]
        cats = [new_name if c == old_name else c for c in cats]
        item.category = ','.join(cats)
    await db.commit()

async def delete_category(db: AsyncSession, category_name: str, replacement: str = None):
    from sqlalchemy import delete, or_
    await db.execute(delete(models.Category).where(models.Category.name == category_name))
    result = await db.execute(select(models.Item).where(
        or_(
            models.Item.category == category_name,
            models.Item.category.like(f"{category_name},%"),
            models.Item.category.like(f"%,{category_name}"),
            models.Item.category.like(f"%,{category_name},%"),
        )
    ))
    items = result.scalars().all()
    for item in items:
        cats = [c.strip() for c in item.category.split(',') if c.strip() != category_name]
        if replacement and replacement not in cats:
            cats.append(replacement)
        item.category = ','.join(cats) if cats else None
    await db.commit()

async def get_category_usage(db: AsyncSession, category_name: str):
    from sqlalchemy import or_
    result = await db.execute(
        select(models.Item)
        .options(selectinload(models.Item.box))
        .where(or_(
            models.Item.category == category_name,
            models.Item.category.like(f"{category_name},%"),
            models.Item.category.like(f"%,{category_name}"),
            models.Item.category.like(f"%,{category_name},%"),
        ))
    )
    items = result.scalars().all()
    boxes = sorted({item.box.name for item in items if item.box})
    return {"count": len(items), "boxes": boxes}

# ── Search ────────────────────────────────────────────────────────────────────

async def search_storage(db: AsyncSession, query: str = "", category: str = None):
    from sqlalchemy import or_
    import sqlalchemy

    if category:
        boxes = []
    else:
        boxes_result = await db.execute(
            select(models.StorageBox)
            .options(selectinload(models.StorageBox.items))
            .where(models.StorageBox.name.ilike(f"%{query}%"))
        )
        boxes = boxes_result.scalars().all()

    item_query = select(models.Item).options(selectinload(models.Item.box))
    conditions = []
    if category:
        conditions.append(or_(
            models.Item.category == category,
            models.Item.category.like(f"{category},%"),
            models.Item.category.like(f"%,{category}"),
            models.Item.category.like(f"%,{category},%"),
        ))
    if query:
        conditions.append(or_(
            models.Item.name.ilike(f"%{query}%"),
            models.Item.category.ilike(f"%{query}%")
        ))
    if conditions:
        item_query = item_query.where(sqlalchemy.and_(*conditions))

    items_result = await db.execute(item_query)
    items = items_result.scalars().all()

    return {"boxes": boxes, "items": items}
