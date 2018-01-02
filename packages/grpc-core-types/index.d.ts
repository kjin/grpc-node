import { CallCredentials } from './call-credentials';
import { ChannelCredentials } from './channel-credentials';
import { Client } from './client';
import { Metadata } from './metadata';

export type CallMetadataGenerator = (options: {},
    cb: (err: Error|null, metadata?: Metadata) => void) => void;

export interface GrpcCore {
  CallCredentials: {
    new(): CallCredentials;
    prototype: CallCredentials;
    createFromMetadataGenerator(metadataGenerator: CallMetadataGenerator)
        : CallCredentials;
    createEmpty(): CallCredentials;
  };
  ChannelCredentials: {
    new(): ChannelCredentials;
    prototype: ChannelCredentials;
    createSsl(rootCerts?: Buffer|null, privateKey?: Buffer|null,
        certChain?: Buffer|null): ChannelCredentials;
    createInsecure(): ChannelCredentials;
  };
  Client: {
    new(): Client;
    prototype: Client;
  };
  Metadata: {
    new(): Metadata;
    prototype: Metadata;
  };
  Status: {
    [key: string]: number;
  };
  PropagateFlags: {
    [key: string]: number;
  }
}
