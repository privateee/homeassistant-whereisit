from pydantic import BaseModel
from typing import List, Optional

# ── Item ──────────────────────────────────────────────────────────────────────

class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int = 1
    category: Optional[str] = None
    photo_path: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    category: Optional[str] = None
    photo_path: Optional[str] = None

class Item(ItemBase):
    id: int
    box_id: int
    class Config:
        from_attributes = True

# ── Box ───────────────────────────────────────────────────────────────────────

class BoxBase(BaseModel):
    name: str
    description: Optional[str] = None
    slug: Optional[str] = None

class BoxCreate(BoxBase):
    location_id: int

class BoxUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    location_id: Optional[int] = None

class BoxSummary(BoxBase):
    id: int
    location_id: int
    class Config:
        from_attributes = True

class Box(BoxSummary):
    items: List[Item] = []
    class Config:
        from_attributes = True

# ── Location ──────────────────────────────────────────────────────────────────

class LocationBase(BaseModel):
    name: str
    description: Optional[str] = None

class LocationCreate(LocationBase):
    unit_id: int

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class LocationSummary(LocationBase):
    id: int
    unit_id: int
    class Config:
        from_attributes = True

class LocationWithBoxes(LocationSummary):
    boxes: List[Box] = []
    class Config:
        from_attributes = True

# ── Unit ──────────────────────────────────────────────────────────────────────

class UnitBase(BaseModel):
    name: str
    description: Optional[str] = None

class UnitCreate(UnitBase):
    pass

class UnitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class UnitResponse(UnitBase):
    id: int
    class Config:
        from_attributes = True

class Unit(UnitBase):
    id: int
    locations: List[LocationWithBoxes] = []
    class Config:
        from_attributes = True

# ── Search ────────────────────────────────────────────────────────────────────

class ItemWithBox(ItemBase):
    id: int
    box_id: int
    box: Optional[BoxSummary] = None
    class Config:
        from_attributes = True

class SearchResponse(BaseModel):
    boxes: List[BoxSummary] = []
    items: List[ItemWithBox] = []

# ── Move ──────────────────────────────────────────────────────────────────────

class MoveBoxRequest(BaseModel):
    target_location_id: int

class MoveItemsRequest(BaseModel):
    item_ids: List[int]
    target_box_id: int

class MergeBoxRequest(BaseModel):
    target_box_id: int
    delete_source: bool = False

# ── Category ──────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str

# ── Flat Box list (for move-items picker) ─────────────────────────────────────

class BoxFlat(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    location_id: int
    location_name: str
    unit_name: str
    class Config:
        from_attributes = True
