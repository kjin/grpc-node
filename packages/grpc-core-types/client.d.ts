import { CallCredentials } from './call-credentials';
import { Status } from './constants';
import { Metadata } from './metadata';
import { EmitterAugmentation0, EmitterAugmentation1 } from './events';
import * as EventEmitter from 'events';
import {Duplex, Readable, Writable} from 'stream';

export interface IntermediateObjectReadable<T> extends Readable {
  read(size?: number): any&T;
}

export type ObjectReadable<T> = {
  read(size?: number): T;
} & EmitterAugmentation1<'data', T>
  & IntermediateObjectReadable<T>;

export interface IntermediateObjectWritable<T> extends Writable {
  _write(chunk: any&T, encoding: string, callback: Function): void;
  write(chunk: any&T, cb?: Function): boolean;
  write(chunk: any&T, encoding?: any, cb?: Function): boolean;
  setDefaultEncoding(encoding: string): this;
  end(): void;
  end(chunk: any&T, cb?: Function): void;
  end(chunk: any&T, encoding?: any, cb?: Function): void;
}

export interface ObjectWritable<T> extends IntermediateObjectWritable<T> {
  _write(chunk: T, encoding: string, callback: Function): void;
  write(chunk: T, cb?: Function): boolean;
  write(chunk: T, encoding?: any, cb?: Function): boolean;
  setDefaultEncoding(encoding: string): this;
  end(): void;
  end(chunk: T, cb?: Function): void;
  end(chunk: T, encoding?: any, cb?: Function): void;
}

export type ObjectDuplex<T, U> = {
  read(size?: number): U;

  _write(chunk: T, encoding: string, callback: Function): void;
  write(chunk: T, cb?: Function): boolean;
  write(chunk: T, encoding?: any, cb?: Function): boolean;
  end(): void;
  end(chunk: T, cb?: Function): void;
  end(chunk: T, encoding?: any, cb?: Function): void;
} & Duplex & ObjectWritable<T> & ObjectReadable<U>;

export type Deadline = Date | number;

export interface CallStreamOptions {
  deadline: Deadline;
  credentials: CallCredentials;
  flags: number;
}

export type CallOptions = {
  // Represents a parent server call.
  // For our purposes we only need to know of the 'cancelled' event.
  parent?: EmitterAugmentation0<'cancelled'> & EventEmitter;
  propagate_flags?: number;
} & Partial<CallStreamOptions>;

export type ServiceError = {
  code?: number;
  metadata?: Metadata;
} & Error;

export interface UnaryCallback<ResponseType> {
  (err: ServiceError|null, value?: ResponseType): void;
}

export interface StatusObject {
  code: Status;
  details: string;
  metadata: Metadata;
}

/**
 * A base type for all user-facing values returned by client-side method calls.
 */
export type Call = {
  cancel(): void;
  getPeer(): string;
} & EmitterAugmentation1<'metadata', Metadata>
  & EmitterAugmentation1<'status', StatusObject>
  & EventEmitter;

/**
 * A type representing the return value of a unary method call.
 */
export type ClientUnaryCall = Call;

/**
 * A type representing the return value of a server stream method call.
 */
export type ClientReadableStream<ResponseType> = {
  deserialize: (chunk: Buffer) => ResponseType;
} & Call & ObjectReadable<ResponseType>;

/**
 * A type representing the return value of a client stream method call.
 */
export type ClientWritableStream<RequestType> = {
  serialize: (value: RequestType) => Buffer;
} & Call & ObjectWritable<RequestType>;

/**
 * A type representing the return value of a bidirectional stream method call.
 */
export type ClientDuplexStream<RequestType, ResponseType> =
  ClientWritableStream<RequestType> & ClientReadableStream<ResponseType>;

export interface Client {
  close(): void;
  waitForReady(deadline: Date|number, callback: (error: Error|null) => void): void;
  getChannel(): {}; // TODO(kjin): but what should this actually return

  makeUnaryRequest<RequestType, ResponseType>(
    method: string, serialize: (value: RequestType) => Buffer,
    deserialize: (value: Buffer) => ResponseType, argument: RequestType,
    metadata: Metadata, options: CallOptions,
    callback: UnaryCallback<ResponseType>): ClientUnaryCall;
  makeUnaryRequest<RequestType, ResponseType>(
      method: string, serialize: (value: RequestType) => Buffer,
      deserialize: (value: Buffer) => ResponseType, argument: RequestType,
      metadata: Metadata,
      callback: UnaryCallback<ResponseType>): ClientUnaryCall;
  makeUnaryRequest<RequestType, ResponseType>(
      method: string, serialize: (value: RequestType) => Buffer,
      deserialize: (value: Buffer) => ResponseType, argument: RequestType,
      options: CallOptions,
      callback: UnaryCallback<ResponseType>): ClientUnaryCall;
  makeUnaryRequest<RequestType, ResponseType>(
      method: string, serialize: (value: RequestType) => Buffer,
      deserialize: (value: Buffer) => ResponseType, argument: RequestType,
      callback: UnaryCallback<ResponseType>): ClientUnaryCall;
  makeClientStreamRequest<RequestType, ResponseType>(
      method: string, serialize: (value: RequestType) => Buffer,
      deserialize: (value: Buffer) => ResponseType, metadata: Metadata,
      options: CallOptions,
      callback: UnaryCallback<ResponseType>): ClientWritableStream<RequestType>;
  makeClientStreamRequest<RequestType, ResponseType>(
      method: string, serialize: (value: RequestType) => Buffer,
      deserialize: (value: Buffer) => ResponseType, metadata: Metadata,
      callback: UnaryCallback<ResponseType>): ClientWritableStream<RequestType>;
  makeClientStreamRequest<RequestType, ResponseType>(
      method: string, serialize: (value: RequestType) => Buffer,
      deserialize: (value: Buffer) => ResponseType, options: CallOptions,
      callback: UnaryCallback<ResponseType>): ClientWritableStream<RequestType>;
  makeClientStreamRequest<RequestType, ResponseType>(
      method: string, serialize: (value: RequestType) => Buffer,
      deserialize: (value: Buffer) => ResponseType,
      callback: UnaryCallback<ResponseType>): ClientWritableStream<RequestType>;
  makeServerStreamRequest<RequestType, ResponseType>(
      method: string, serialize: (value: RequestType) => Buffer,
      deserialize: (value: Buffer) => ResponseType, argument: RequestType,
      metadata: Metadata,
      options?: CallOptions): ClientReadableStream<ResponseType>;
  makeServerStreamRequest<RequestType, ResponseType>(
      method: string, serialize: (value: RequestType) => Buffer,
      deserialize: (value: Buffer) => ResponseType, argument: RequestType,
      options?: CallOptions): ClientReadableStream<ResponseType>;
  makeBidiStreamRequest<RequestType, ResponseType>(
      method: string, serialize: (value: RequestType) => Buffer,
      deserialize: (value: Buffer) => ResponseType, metadata: Metadata,
      options?: CallOptions): ClientDuplexStream<RequestType, ResponseType>;
  makeBidiStreamRequest<RequestType, ResponseType>(
      method: string, serialize: (value: RequestType) => Buffer,
      deserialize: (value: Buffer) => ResponseType,
      options?: CallOptions): ClientDuplexStream<RequestType, ResponseType>;
}
