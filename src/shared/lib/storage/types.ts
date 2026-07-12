export interface StoredFile {
  key: string;
  url: string;
  name: string;
  size: number;
}

/**
 * Provider-agnostic contract every storage adapter implements. Feature code
 * depends on this interface, never on a concrete provider — swapping
 * UploadThing for Cloudflare R2/S3 later (see PROJECT.md, "File storage")
 * means writing one new adapter file, not touching call sites.
 */
export interface StorageProvider {
  /** Deletes one or more previously uploaded files by their storage key. */
  delete(keys: string | string[]): Promise<void>;
  /** Resolves the access URL for a stored file. */
  getUrl(key: string): string;
}
