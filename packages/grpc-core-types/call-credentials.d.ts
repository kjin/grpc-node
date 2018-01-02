import { Metadata } from './metadata';

/**
 * A class that represents a generic method of adding authentication-related
 * metadata on a per-request basis.
 */
export interface CallCredentials {
  /**
   * Asynchronously generates a new Metadata object.
   * @param options Options used in generating the Metadata object.
   */
  generateMetadata(options: {}): Promise<Metadata>;
  /**
   * Creates a new CallCredentials object from properties of both this and
   * another CallCredentials object. This object's metadata generator will be
   * called first.
   * @param callCredentials The other CallCredentials object.
   */
  compose(callCredentials: CallCredentials): CallCredentials;
}
