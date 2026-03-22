import { DestinoImpresion, TipoOrden } from '@/generated/prisma/enums';

export interface Modificadores {
  nombre_modificador: string;
}

export interface ItemOrden {
  nombre_producto: string;
  nombre_variante: string | null;
  cantidad: number;
  area_impresion: DestinoImpresion;
  notas: string | null;
  modificadores_item_orden: Modificadores[];
}

export interface OrdenParaImprimir {
  numero_orden: string;
  numero_diario: number;
  fecha: string;
  piso: number | null;
  numero_mesa: string | null;
  mesero: string | null;
  notas: string | null;
  tipoPedido: TipoOrden;
  items_orden: ItemOrden[];
}
