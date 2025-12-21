import { useMemo } from 'react';
import { Repuesto, TagAsignado, isTagAsignado, getTagNombre } from '../types';

/**
 * Hook con helpers para trabajar con el nuevo sistema de tags con eventos
 */
export function useTagsHelpers(repuestos: Repuesto[], filtroTagActivo: string | null) {
  
  // Obtener todos los nombres de tags únicos de todos los repuestos
  const tagsEnUso = useMemo(() => {
    const tagsSet = new Set<string>();
    repuestos.forEach(r => {
      r.tags?.forEach(tag => {
        tagsSet.add(getTagNombre(tag));
      });
    });
    return Array.from(tagsSet).sort((a, b) => a.localeCompare(b, 'es'));
  }, [repuestos]);

  // Obtener cantidad de solicitud para un repuesto según el filtro activo
  const getCantidadSolicitada = useMemo(() => {
    return (repuesto: Repuesto): number => {
      if (!filtroTagActivo) return 0; // Sin filtro = 0
      
      const tagEncontrado = repuesto.tags?.find(tag => {
        if (isTagAsignado(tag)) {
          return tag.nombre === filtroTagActivo && tag.tipo === 'solicitud';
        }
        return false;
      });
      
      if (tagEncontrado && isTagAsignado(tagEncontrado)) {
        return tagEncontrado.cantidad;
      }
      
      // Fallback: si el tag es string (formato antiguo), usar cantidadSolicitada del repuesto
      const tieneTagAntiguo = repuesto.tags?.some(tag => 
        typeof tag === 'string' && tag === filtroTagActivo
      );
      if (tieneTagAntiguo) {
        return repuesto.cantidadSolicitada || 0;
      }
      
      return 0;
    };
  }, [filtroTagActivo]);

  // Obtener cantidad de stock para un repuesto según el filtro activo
  const getCantidadStock = useMemo(() => {
    return (repuesto: Repuesto): number => {
      if (!filtroTagActivo) return 0; // Sin filtro = 0
      
      const tagEncontrado = repuesto.tags?.find(tag => {
        if (isTagAsignado(tag)) {
          return tag.nombre === filtroTagActivo && tag.tipo === 'stock';
        }
        return false;
      });
      
      if (tagEncontrado && isTagAsignado(tagEncontrado)) {
        return tagEncontrado.cantidad;
      }
      
      // Fallback: si el tag es string (formato antiguo), usar cantidadStockBodega del repuesto
      const tieneTagAntiguo = repuesto.tags?.some(tag => 
        typeof tag === 'string' && tag === filtroTagActivo
      );
      if (tieneTagAntiguo) {
        return repuesto.cantidadStockBodega || 0;
      }
      
      return 0;
    };
  }, [filtroTagActivo]);

  // Calcular totales según el filtro activo
  const totalesPorFiltro = useMemo(() => {
    if (!filtroTagActivo) {
      return {
        totalSolicitado: 0,
        totalStock: 0,
        totalSolicitadoUSD: 0,
        totalStockUSD: 0,
        totalUSD: 0,
        repuestosEnFiltro: 0
      };
    }

    let totalSolicitado = 0;
    let totalStock = 0;
    let totalSolicitadoUSD = 0;
    let totalStockUSD = 0;
    let repuestosEnFiltro = 0;

    repuestos.forEach(r => {
      const tieneTag = r.tags?.some(tag => getTagNombre(tag) === filtroTagActivo);
      if (tieneTag) {
        repuestosEnFiltro++;
        const cantSol = getCantidadSolicitada(r);
        const cantStock = getCantidadStock(r);
        totalSolicitado += cantSol;
        totalStock += cantStock;
        totalSolicitadoUSD += cantSol * r.valorUnitario;
        totalStockUSD += cantStock * r.valorUnitario;
      }
    });

    return {
      totalSolicitado,
      totalStock,
      totalSolicitadoUSD,
      totalStockUSD,
      totalUSD: totalSolicitadoUSD + totalStockUSD,
      repuestosEnFiltro
    };
  }, [repuestos, filtroTagActivo, getCantidadSolicitada, getCantidadStock]);

  // Obtener info del tag: fecha más reciente, tipos que tiene
  const getTagInfo = useMemo(() => {
    return (tagNombre: string) => {
      let fechaMasReciente: Date | null = null;
      let tieneSolicitud = false;
      let tieneStock = false;
      let totalRepuestos = 0;

      repuestos.forEach(r => {
        r.tags?.forEach(tag => {
          if (getTagNombre(tag) === tagNombre) {
            totalRepuestos++;
            if (isTagAsignado(tag)) {
              if (tag.tipo === 'solicitud') tieneSolicitud = true;
              if (tag.tipo === 'stock') tieneStock = true;
              if (!fechaMasReciente || new Date(tag.fecha) > fechaMasReciente) {
                fechaMasReciente = new Date(tag.fecha);
              }
            }
          }
        });
      });

      return {
        fechaMasReciente,
        tieneSolicitud,
        tieneStock,
        totalRepuestos
      };
    };
  }, [repuestos]);

  // Obtener el último evento de solicitud y stock (para mostrar sin filtro)
  const ultimosEventos = useMemo(() => {
    let ultimoSolicitud: { tag: string; fecha: Date } | null = null;
    let ultimoStock: { tag: string; fecha: Date } | null = null;

    repuestos.forEach(r => {
      r.tags?.forEach(tag => {
        if (isTagAsignado(tag)) {
          const fecha = new Date(tag.fecha);
          if (tag.tipo === 'solicitud') {
            if (!ultimoSolicitud || fecha > ultimoSolicitud.fecha) {
              ultimoSolicitud = { tag: tag.nombre, fecha };
            }
          }
          if (tag.tipo === 'stock') {
            if (!ultimoStock || fecha > ultimoStock.fecha) {
              ultimoStock = { tag: tag.nombre, fecha };
            }
          }
        }
      });
    });

    return { ultimoSolicitud, ultimoStock };
  }, [repuestos]);

  return {
    tagsEnUso,
    getCantidadSolicitada,
    getCantidadStock,
    totalesPorFiltro,
    getTagInfo,
    ultimosEventos
  };
}

/**
 * Convertir tags antiguos (string[]) a nuevo formato (TagAsignado[])
 * Útil para migración de datos
 */
export function migrarTagsANuevoFormato(
  tagsAntiguos: string[],
  cantidadSolicitada: number,
  cantidadStockBodega: number
): TagAsignado[] {
  // Por defecto, asumimos que los tags antiguos son de tipo 'solicitud'
  // excepto si contienen palabras clave de stock
  return tagsAntiguos.map(nombre => {
    const esStock = nombre.toLowerCase().includes('stock') || 
                    nombre.toLowerCase().includes('bodega') ||
                    nombre.toLowerCase().includes('inventario');
    
    return {
      nombre,
      tipo: esStock ? 'stock' : 'solicitud',
      cantidad: esStock ? cantidadStockBodega : cantidadSolicitada,
      fecha: new Date()
    };
  });
}

/**
 * Agregar un tag a un repuesto (nuevo formato)
 */
export function agregarTagARepuesto(
  tagsActuales: (string | TagAsignado)[],
  nuevoTag: TagAsignado
): TagAsignado[] {
  // Convertir cualquier tag antiguo al nuevo formato primero
  const tagsConvertidos: TagAsignado[] = tagsActuales.map(tag => {
    if (isTagAsignado(tag)) return tag;
    // Tag antiguo - convertir con valores por defecto
    return {
      nombre: tag,
      tipo: 'solicitud' as const,
      cantidad: 0,
      fecha: new Date()
    };
  });

  // Verificar si ya existe un tag con el mismo nombre y tipo
  const existeIdx = tagsConvertidos.findIndex(
    t => t.nombre === nuevoTag.nombre && t.tipo === nuevoTag.tipo
  );

  if (existeIdx >= 0) {
    // Actualizar el existente
    tagsConvertidos[existeIdx] = nuevoTag;
  } else {
    // Agregar nuevo
    tagsConvertidos.push(nuevoTag);
  }

  return tagsConvertidos;
}

/**
 * Quitar un tag de un repuesto
 */
export function quitarTagDeRepuesto(
  tagsActuales: (string | TagAsignado)[],
  nombreTag: string,
  tipo?: 'solicitud' | 'stock'
): (string | TagAsignado)[] {
  return tagsActuales.filter(tag => {
    const nombre = getTagNombre(tag);
    if (nombre !== nombreTag) return true;
    
    // Si se especifica tipo, solo quitar ese tipo
    if (tipo && isTagAsignado(tag)) {
      return tag.tipo !== tipo;
    }
    
    // Si no se especifica tipo, quitar todos con ese nombre
    return false;
  });
}
