export type MetadataValue = string | Buffer;

export interface MetadataObject { [key: string]: Array<MetadataValue>; }

export interface Metadata {
  set(key: string, value: MetadataValue): void;
  add(key: string, value: MetadataValue): void;
  remove(key: string): void;
  get(key: string): Array<MetadataValue>;
  getMap(): { [key: string]: MetadataValue };
  clone(): Metadata;
  merge(metadata: Metadata): void;
}
