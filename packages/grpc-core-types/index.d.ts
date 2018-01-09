import { CallCredentials } from './call-credentials';
import { Channel } from './channel';
import { ChannelCredentials } from './channel-credentials';
import { Client } from './client';
import { Metadata } from './metadata';
import { Server } from './server';
import { ServerCredentials } from './server-credentials';

export {
  CallCredentials,
  Channel,
  ChannelCredentials,
  Client,
  Metadata,
  Server,
  ServerCredentials
};

export type Constructor<T> = {
  new(...args: any[]): T;
  prototype: T;
};

export interface Enum {
  [key: string]: number;
}

export type CallMetadataGenerator = (options: {},
    cb: (err: Error|null, metadata?: Metadata) => void) => void;

export interface Logger {
  error: typeof console.error;
}

export interface GrpcCore {
  CallCredentials: {
    createFromMetadataGenerator(metadataGenerator: CallMetadataGenerator)
        : CallCredentials;
    createEmpty(): CallCredentials;
  };
  ChannelCredentials: {
    createSsl(rootCerts?: Buffer|null, privateKey?: Buffer|null,
        certChain?: Buffer|null): ChannelCredentials;
    createInsecure(): ChannelCredentials;
  };
  Client: Constructor<Client>;
  Metadata: Constructor<Metadata>;
  Server: Constructor<Server>;
  ServerCredentials: Constructor<ServerCredentials>;
  Constants: {
    Status: Enum;
    PropagateFlags: Enum;
    CallError: Enum;
    WriteFlags: Enum;
    LogVerbosity: Enum;
  };
  Logging: {
    setLogger(logger: Logger): void;
    setLogVerbosity(verbosity: number): void; // TODO
  }
}
