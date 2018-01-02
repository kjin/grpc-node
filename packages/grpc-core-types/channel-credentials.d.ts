import { CallCredentials } from './call-credentials';
import { SecureContext } from 'tls';

/**
 * A class that contains credentials for communicating over a channel, as well
 * as a set of per-call credentials, which are applied to every method call made
 * over a channel initialized with an instance of this class.
 */
export interface ChannelCredentials {
  /**
   * Returns a copy of this object with the included set of per-call credentials
   * expanded to include callCredentials.
   * @param callCredentials A CallCredentials object to associate with this
   * instance.
   */
  compose(callCredentials: CallCredentials): ChannelCredentials;

  /**
   * Gets the set of per-call credentials associated with this instance.
   */
  getCallCredentials(): CallCredentials;

  /**
   * Gets a SecureContext object generated from input parameters if this
   * instance was created with createSsl, or null if this instance was created
   * with createInsecure.
   */
  getSecureContext(): SecureContext|null;
}
