/**
 * @license
 * Copyright 2017 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// TODO(kjin): Improve on Function types

import * as util from 'util';
import * as _ from 'lodash';
import {
  GrpcCore,
  CallCredentials,
  ChannelCredentials,
  Channel,
  Client,
  Metadata,
  Server,
  ServerCredentials,
  Constructor,
  Enum,
  Logger
} from '@grpc/core-types';
import { UnaryCallback, CallOptions } from '@grpc/core-types/client';

const compose = <S extends { compose: (other: T) => S }, T>(a: S, b: T) => a.compose(b);

interface ClientClassOptions {
  deprecatedArgumentOrder?: boolean;
}

interface ClientMethodAttributes {
  requestStream: boolean;
  responseStream: boolean;
  requestSerialize: Function;
  responseDeserialize: Function;
  originalName: string;
  path: string;
}

interface ClientMethods {
  [key: string]: ClientMethodAttributes;
}

namespace makeSurface {
  export type GrpcSurface = {
    Client: Constructor<Client>;
    Metadata: Constructor<Metadata>;
    Server: Constructor<Server>;
    ServerCredentials: Constructor<ServerCredentials>;
    makeClientConstructor: Function;
    makeGenericClientConstructor: Function;
    credentials: {};
    getClientChannel(client: Client): Channel;
    waitForClientReady(client: Client, deadline: number|Date, callback: (err: Error|null) => {}): void;
    closeClient(client: Client): void;
    setLogger(logger: Logger): void;
    setLogVerbosity(verbosity: number): void;
    callError: Enum;
    logVerbosity: Enum;
    propagate: Enum;
    status: Enum;
    writeFlags: Enum;
  };
}

function makeSurface(grpc: GrpcCore): makeSurface.GrpcSurface {
  function getDefaultValues<T>(metadata?: Metadata, options?: T): {
    metadata: Metadata;
    options: Partial<T>;
  } {
    return {
      metadata: metadata || new grpc.Metadata(),
      options: options || {}
    };
  }

  /**
   * Map with wrappers for each type of requester function to make it use the old
   * argument order with optional arguments after the callback.
   * @access private
   */
  const deprecated_request_wrap = {
    unary: (makeUnaryRequest: Function) => {
      return function makeWrappedUnaryRequest<RequestType, ResponseType>(
          this: Client, argument: RequestType,
          callback: UnaryCallback<ResponseType>, metadata?: Metadata,
          options?: CallOptions) {
        const opt_args = getDefaultValues(metadata, options);
        return makeUnaryRequest.call(this, argument, opt_args.metadata,
                                      opt_args.options, callback);
      };
    },
    client_stream: (makeServerStreamRequest: Function) => {
      return function makeWrappedClientStreamRequest<RequestType, ResponseType>(
          this: Client, callback: UnaryCallback<ResponseType>,
          metadata?: Metadata, options?: CallOptions) {
        const opt_args = getDefaultValues(metadata, options);
        return makeServerStreamRequest.call(this, opt_args.metadata,
                                            opt_args.options, callback);
      };
    },
    server_stream: (f: Function) => f,
    bidi: (f: Function) => f
  };

  /**
   * Map with short names for each of the requester maker functions. Used in
   * makeClientConstructor
   * @private
   */
  const requester_funcs = {
    unary: grpc.Client.prototype.makeUnaryRequest,
    server_stream: grpc.Client.prototype.makeServerStreamRequest,
    client_stream: grpc.Client.prototype.makeClientStreamRequest,
    bidi: grpc.Client.prototype.makeBidiStreamRequest
  };

  /**
   * Creates a constructor for a client with the given methods, as specified in
   * the methods argument. The resulting class will have an instance method for
   * each method in the service, which is a partial application of one of the
   * [Client]{@link grpc.Client} request methods, depending on `requestSerialize`
   * and `responseSerialize`, with the `method`, `serialize`, and `deserialize`
   * arguments predefined.
   * @memberof grpc
   * @alias grpc~makeGenericClientConstructor
   * @param {grpc~ServiceDefinition} methods An object mapping method names to
   *     method attributes
   * @param {string} serviceName The fully qualified name of the service
   * @param {Object} class_options An options object.
   * @return {function} New client constructor, which is a subclass of
   *     {@link grpc.Client}, and has the same arguments as that constructor.
   */
  const makeClientConstructor = (methods: ClientMethods, serviceName: string,
      class_options: ClientClassOptions) => {
    if (!class_options) {
      class_options = {};
    }

    class ServiceClient extends grpc.Client {
      static service: {};
      [methodName: string]: Function;
    }

    _.each(methods, (attrs, name) => {
      let method_type: keyof typeof requester_funcs;
      // TODO(murgatroid99): Verify that we don't need this anymore
      if (_.startsWith(name, '$')) {
        throw new Error('Method names cannot start with $');
      }
      if (attrs.requestStream) {
        if (attrs.responseStream) {
          method_type = 'bidi';
        } else {
          method_type = 'client_stream';
        }
      } else {
        if (attrs.responseStream) {
          method_type = 'server_stream';
        } else {
          method_type = 'unary';
        }
      }
      const serialize = attrs.requestSerialize;
      const deserialize = attrs.responseDeserialize;
      const method_func = _.partial(requester_funcs[method_type], attrs.path,
                                  serialize, deserialize);
      if (class_options.deprecatedArgumentOrder) {
        ServiceClient.prototype[name] = deprecated_request_wrap[method_type](method_func);
      } else {
        ServiceClient.prototype[name] = method_func;
      }
      // Associate all provided attributes with the method
      _.assign(ServiceClient.prototype[name], attrs);
      if (attrs.originalName) {
        ServiceClient.prototype[attrs.originalName] = ServiceClient.prototype[name];
      }
    });

    ServiceClient.service = methods;

    return ServiceClient;
  };

  return {
    Client: grpc.Client,
    Metadata: grpc.Metadata,
    Server: grpc.Server,
    ServerCredentials: grpc.ServerCredentials,
    makeClientConstructor,
    makeGenericClientConstructor: makeClientConstructor,
    credentials: {
      createSsl: grpc.ChannelCredentials.createSsl,
      createFromMetadataGenerator: grpc.CallCredentials.createFromMetadataGenerator,
      createFromGoogleCredential: (googleCredential: any) => {
        return grpc.CallCredentials.createFromMetadataGenerator((authContext, callback) => {
          const serviceUrl = (authContext as any).service_url;
          googleCredential.getRequestMetadata(serviceUrl, (err: Error, header: any) => {
            if (err) {
              callback(err);
              return;
            }
            const metadata = new grpc.Metadata();
            metadata.add('authorization', header.Authorization);
            callback(null, metadata);
          });
        });
      },
      combineChannelCredentials: (channelCredentials: ChannelCredentials,
          ...callCredentialsList: CallCredentials[]): ChannelCredentials => {
        return callCredentialsList.reduce(compose, channelCredentials);
      },
      combineCallCredentials: (...callCredentialsList: CallCredentials[]): CallCredentials => {
        return callCredentialsList.slice(1).reduce(compose, callCredentialsList[0]);
      },
      createInsecure: grpc.ChannelCredentials.createInsecure
    },
    getClientChannel(client: Client) { return client.getChannel(); },
    waitForClientReady(client: Client, deadline: number|Date, callback: (err: Error|null) => {}) {
      client.waitForReady(deadline, callback);
    },
    closeClient(client: Client) { return client.close(); },
    setLogger: grpc.Logging.setLogger,
    setLogVerbosity: grpc.Logging.setLogVerbosity,
    callError: grpc.Constants.CallError,
    logVerbosity: grpc.Constants.LogVerbosity,
    propagate: grpc.Constants.PropagateFlags,
    status: grpc.Constants.Status,
    writeFlags: grpc.Constants.WriteFlags
  };
};

export = makeSurface;
