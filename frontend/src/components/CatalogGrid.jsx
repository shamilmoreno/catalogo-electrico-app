import React from 'react';
import ProductCard from './ProductCard';

export default function CatalogGrid({
  items,
  customImages,
  currentUser,
  reqItemsMap = {},
  onAddToReq,
  onUpdateReqQty,
  onOpenImageModal,
  onOpenDatasheet,
  onEditMaterial,
  onDeleteMaterial,
  onToggleStock,
}) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 mt-4 no-print">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-box-open text-2xl"></i>
        </div>
        <h3 className="text-lg font-semibold text-slate-800">
          No se encontraron productos
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
          Verifica las palabras clave introducidas o selecciona otra familia.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 grid-print">
      {items.map((item) => (
        <ProductCard
          key={item.id}
          item={item}
          customImg={customImages[item.title]}
          currentUser={currentUser}
          reqItem={reqItemsMap[item.id]}
          onAddToReq={onAddToReq}
          onUpdateReqQty={onUpdateReqQty}
          onOpenImageModal={onOpenImageModal}
          onOpenDatasheet={onOpenDatasheet}
          onEditMaterial={onEditMaterial}
          onDeleteMaterial={onDeleteMaterial}
          onToggleStock={onToggleStock}
        />
      ))}
    </div>
  );
}
