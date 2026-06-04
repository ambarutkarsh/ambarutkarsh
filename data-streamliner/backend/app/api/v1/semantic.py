from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ...core.deps import get_db, get_current_user, require_data_admin
from ...models.semantic import SemanticLayer
from ...schemas.semantic import SemanticLayerOut, SemanticLayerCreate, SemanticLayerUpdate

router = APIRouter()


@router.get("/", response_model=List[SemanticLayerOut])
def list_semantic_layers(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(SemanticLayer).all()


@router.post("/", response_model=SemanticLayerOut, status_code=status.HTTP_201_CREATED)
def create_semantic_layer(payload: SemanticLayerCreate, db: Session = Depends(get_db), data_admin=Depends(require_data_admin)):
    layer = SemanticLayer(
        name=payload.name,
        description=payload.description,
        dataset_id=payload.dataset_id,
        mappings=payload.mappings,
        created_by=data_admin.id,
    )
    db.add(layer)
    db.commit()
    db.refresh(layer)
    return SemanticLayerOut.model_validate(layer)


@router.get("/{layer_id}", response_model=SemanticLayerOut)
def get_semantic_layer(layer_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    layer = db.query(SemanticLayer).filter(SemanticLayer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Semantic layer not found")
    return SemanticLayerOut.model_validate(layer)


@router.put("/{layer_id}", response_model=SemanticLayerOut)
def update_semantic_layer(layer_id: int, payload: SemanticLayerUpdate, db: Session = Depends(get_db), data_admin=Depends(require_data_admin)):
    layer = db.query(SemanticLayer).filter(SemanticLayer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Semantic layer not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(layer, k, v)
    db.commit()
    db.refresh(layer)
    return SemanticLayerOut.model_validate(layer)
