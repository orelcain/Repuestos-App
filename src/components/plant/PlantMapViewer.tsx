import { useMemo, useRef, useState } from 'react';
import type { PlantAsset, PlantMap, PlantMarker } from '../../types';

export function PlantMapViewer(props: {
  map: PlantMap;
  selectedAsset: PlantAsset | null;
  allAssets: PlantAsset[];
  showAllMarkers: boolean;
  addingMarker: boolean;
  onAddMarker: (args: { mapId: string; x: number; y: number }) => void;
  onSelectAsset?: (assetId: string) => void;
}) {
  const { map, selectedAsset, allAssets, showAllMarkers, addingMarker, onAddMarker, onSelectAsset } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const markers = useMemo(() => {
    const pickMarkers = (asset: PlantAsset): Array<PlantMarker & { assetId: string; assetLabel: string }> => {
      return (asset.marcadores || [])
        .filter((m) => m.mapId === map.id)
        .map((m) => ({
          ...m,
          assetId: asset.id,
          assetLabel: `${asset.tipo.toUpperCase()} • ${asset.codigoSAP}`
        }));
    };

    if (showAllMarkers) {
      return allAssets.flatMap(pickMarkers);
    }

    if (!selectedAsset) return [];
    return pickMarkers(selectedAsset);
  }, [allAssets, map.id, selectedAsset, showAllMarkers]);

  const handleClick = (e: React.MouseEvent) => {
    if (!addingMarker) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    onAddMarker({ mapId: map.id, x: clamp(x), y: clamp(y) });
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        onClick={handleClick}
        className={
          `relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 ` +
          (addingMarker ? 'cursor-crosshair' : 'cursor-default')
        }
        style={{ aspectRatio: '16 / 9' }}
        title={addingMarker ? 'Click para agregar marcador' : 'Plano'}
      >
        <img
          src={map.imageUrl}
          alt={map.nombre}
          className={
            `absolute inset-0 w-full h-full object-contain transition-opacity ` +
            (imgLoaded ? 'opacity-100' : 'opacity-0')
          }
          onLoad={() => setImgLoaded(true)}
          draggable={false}
        />

        {/* Marcadores */}
        {markers.map((m) => {
          const isSelected = selectedAsset?.id === m.assetId;
          const canSelect = showAllMarkers && !!onSelectAsset;
          return (
            <button
              key={m.id}
              type="button"
              onClick={(e) => {
                if (!canSelect) return;
                e.preventDefault();
                e.stopPropagation();
                onSelectAsset?.(m.assetId);
              }}
              className={
                `absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600 ring-2 ring-white dark:ring-gray-900 ` +
                (isSelected ? 'w-4 h-4' : 'w-3 h-3') +
                (canSelect ? ' cursor-pointer hover:scale-110 transition-transform' : ' cursor-default')
              }
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
              title={m.assetLabel}
            />
          );
        })}

        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 dark:text-gray-300">
            Cargando plano...
          </div>
        )}
      </div>

      {markers.length === 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-300">
          {showAllMarkers
            ? 'No hay marcadores en este plano.'
            : selectedAsset
              ? 'Este activo no tiene marcadores en este plano.'
              : 'Selecciona un motor/bomba para ver sus marcadores.'}
        </div>
      )}
    </div>
  );
}
