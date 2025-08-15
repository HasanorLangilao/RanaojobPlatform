// Type definitions for third-party modules
declare module 'leaflet' {
  export class Map {
    // Basic Map methods
    remove(): void;
    setView(center: LatLngExpression, zoom: number, options?: ZoomPanOptions): this;
    fitBounds(bounds: LatLngBoundsExpression, options?: FitBoundsOptions): this;
  }

  export class Marker {
    remove(): void;
    addTo(map: Map): this;
    bindTooltip(content: Tooltip | string): this;
    on(event: string, fn: Function): this;
  }

  export class Tooltip {
    setContent(content: string): this;
  }

  export function map(element: HTMLElement | string, options?: MapOptions): Map;
  export function marker(latlng: LatLngExpression, options?: MarkerOptions): Marker;
  export function tooltip(options?: TooltipOptions): Tooltip;
  export function divIcon(options?: DivIconOptions): Icon;
  export function tileLayer(urlTemplate: string, options?: TileLayerOptions): TileLayer;
  export function geoJSON(data: any, options?: GeoJSONOptions): GeoJSON;
  export function latLng(latitude: number, longitude: number): LatLng;
  export function latLngBounds(corner1: LatLngExpression, corner2: LatLngExpression): LatLngBounds;
  export function featureGroup(layers?: Layer[]): FeatureGroup;

  export interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    maxBounds?: LatLngBoundsExpression;
    maxBoundsViscosity?: number;
  }

  export interface MarkerOptions {
    icon?: Icon;
  }

  export interface TooltipOptions {
    direction?: string;
    permanent?: boolean;
    opacity?: number;
    className?: string;
  }

  export interface DivIconOptions {
    className?: string;
    html?: string;
    iconSize?: PointExpression;
    iconAnchor?: PointExpression;
    popupAnchor?: PointExpression;
  }

  export interface TileLayerOptions {
    attribution?: string;
  }

  export interface GeoJSONOptions {
    style?: any;
  }

  export interface FitBoundsOptions {
    padding?: PointExpression;
    maxZoom?: number;
  }

  export interface ZoomPanOptions {
    animate?: boolean;
  }

  export type LatLngExpression = LatLng | [number, number];
  export type LatLngBoundsExpression = LatLngBounds | LatLngExpression[];
  export type PointExpression = Point | [number, number];

  export class LatLng {}
  export class LatLngBounds {}
  export class Point {}
  export class Icon {}
  export class TileLayer extends Layer {}
  export class GeoJSON extends Layer {}
  export class Layer {
    addTo(map: Map): this;
  }
  export class FeatureGroup extends Layer {
    getBounds(): LatLngBounds;
  }
} 