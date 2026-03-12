"""
One-time migration: upgrades the DB from the old Unit→Box schema
to the new Unit→Location→Box schema.

Run manually inside the container if you have existing data:
  python /app/migrate.py

Or it is called automatically from main.py on startup (safe to re-run).
"""

import asyncio
import os
from sqlalchemy import text
from .database import engine, Base

async def run_migration():
    async with engine.begin() as conn:
        # 1. Create the locations table if it doesn't exist
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                unit_id INTEGER REFERENCES storage_units(id) ON DELETE CASCADE
            )
        """))

        # 2. Check if storage_boxes still has the old unit_id column
        cols = await conn.execute(text("PRAGMA table_info(storage_boxes)"))
        col_names = [row[1] for row in cols.fetchall()]

        if "unit_id" in col_names and "location_id" not in col_names:
            # 3. For each unit, create a default location and migrate boxes to it
            units = await conn.execute(text("SELECT id, name FROM storage_units"))
            for unit_id, unit_name in units.fetchall():
                # Insert a default location per unit
                await conn.execute(text(
                    "INSERT INTO locations (name, description, unit_id) VALUES (:name, :desc, :uid)"
                ), {"name": unit_name, "desc": "Default location", "uid": unit_id})

                loc = await conn.execute(text("SELECT last_insert_rowid()"))
                loc_id = loc.scalar()

                # Point all boxes from this unit to the new location
                await conn.execute(text(
                    "UPDATE storage_boxes SET location_id = :lid WHERE unit_id = :uid"
                ), {"lid": loc_id, "uid": unit_id})

            # 4. Rename the old column (SQLite needs table recreation)
            await conn.execute(text("""
                CREATE TABLE storage_boxes_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    slug TEXT UNIQUE,
                    name TEXT,
                    description TEXT,
                    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE
                )
            """))
            await conn.execute(text("""
                INSERT INTO storage_boxes_new (id, slug, name, description, location_id)
                SELECT id, slug, name, description, location_id FROM storage_boxes
            """))
            await conn.execute(text("DROP TABLE storage_boxes"))
            await conn.execute(text("ALTER TABLE storage_boxes_new RENAME TO storage_boxes"))

        elif "location_id" not in col_names:
            # Fresh install path: just add the column (table created by SQLAlchemy)
            pass

if __name__ == "__main__":
    asyncio.run(run_migration())
