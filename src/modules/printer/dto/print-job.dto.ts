import { DestinoImpresion, TipoOrden } from '@/generated/prisma/enums';

export interface ModificadoresJob {
  nombre_modificador: string;
}

export interface ItemOrdenJob {
  nombre_producto: string;
  nombre_variante: string | null;
  cantidad: number;
  notas: string | null;
  modificadores_item_orden: ModificadoresJob[];
}

export interface OrdenParaImprimirJob {
  numero_orden: string;
  numero_diario: number;
  fecha: string;
  piso: number | null;
  numero_mesa: string | null;
  mesero: string | null;
  destino: DestinoImpresion;
  notas: string | null;
  tipoPedido: TipoOrden;
  items: ItemOrdenJob[];
}
