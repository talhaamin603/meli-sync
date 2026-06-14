from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.models import Category

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str
    parent_id: int | None = None


@router.get("")
def get_categories(session: Session = Depends(get_session)):
    cats = session.exec(select(Category).order_by(Category.parent_id, Category.name)).all()
    return [
        {"id": c.id, "name": c.name, "parent_id": c.parent_id, "created_at": c.created_at}
        for c in cats
    ]


@router.post("")
def create_category(body: CategoryCreate, session: Session = Depends(get_session)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name cannot be empty.")

    if body.parent_id:
        parent = session.get(Category, body.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found.")

    if body.parent_id:
        # Subcategory names must be globally unique across all subcategories
        existing = session.exec(
            select(Category).where(Category.name == name, Category.parent_id != None)
        ).first()
        if existing:
            parent = session.get(Category, existing.parent_id)
            parent_name = parent.name if parent else "another category"
            raise HTTPException(status_code=400, detail=f'"{name}" already exists under "{parent_name}".')
    else:
        # Main category names must be unique at the root level
        existing = session.exec(
            select(Category).where(Category.name == name, Category.parent_id == None)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f'"{name}" already exists as a main category.')

    cat = Category(name=name, parent_id=body.parent_id)
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return {"id": cat.id, "name": cat.name, "parent_id": cat.parent_id, "created_at": cat.created_at}


class CategoryUpdate(BaseModel):
    name: str


@router.put("/{id}")
def update_category(id: int, body: CategoryUpdate, session: Session = Depends(get_session)):
    cat = session.get(Category, id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name cannot be empty.")
    if cat.parent_id:
        existing = session.exec(
            select(Category).where(Category.name == name, Category.parent_id != None, Category.id != id)
        ).first()
        if existing:
            parent = session.get(Category, existing.parent_id)
            parent_name = parent.name if parent else "another category"
            raise HTTPException(status_code=400, detail=f'"{name}" already exists under "{parent_name}".')
    else:
        existing = session.exec(
            select(Category).where(Category.name == name, Category.parent_id == None, Category.id != id)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f'"{name}" already exists as a main category.')
    cat.name = name
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return {"id": cat.id, "name": cat.name, "parent_id": cat.parent_id, "created_at": cat.created_at}


@router.delete("/{id}")
def delete_category(id: int, session: Session = Depends(get_session)):
    cat = session.get(Category, id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    children = session.exec(select(Category).where(Category.parent_id == id)).all()
    if children:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete — this category has {len(children)} subcategory(s). Delete them first."
        )

    session.delete(cat)
    session.commit()
    return {"ok": True}
