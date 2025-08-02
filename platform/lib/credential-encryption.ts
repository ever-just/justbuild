/**
 * Credential Encryption Service
 * 
 * Handles secure encryption/decryption of user database credentials
 * Uses AES-256-GCM for authenticated encryption
 * Each credential set gets a unique IV for security
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { EncryptedCredentials } from './database-abstraction';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV
const TAG_LENGTH = 16; // 128-bit authentication tag
const SALT_LENGTH = 32; // 256-bit salt

export class CredentialEncryption {
  private static masterKey: string | null = null;

  /**
   * Initialize the encryption service with a master key
   * In production, this should come from a secure key management service
   */
  static initialize(masterKey?: string): void {
    if (masterKey) {
      this.masterKey = masterKey;
    } else {
      // Use environment variable or generate a key
      this.masterKey = process.env.CREDENTIAL_MASTER_KEY || this.generateMasterKey();
      
      if (!process.env.CREDENTIAL_MASTER_KEY) {
        console.warn(
          '⚠️  No CREDENTIAL_MASTER_KEY found in environment. ' +
          'Using generated key - credentials will not persist across restarts!'
        );
      }
    }
  }

  /**
   * Encrypt user credentials for secure storage
   */
  static async encryptCredentials(
    credentials: any,
    serviceType: string,
    userId: string
  ): Promise<EncryptedCredentials> {
    if (!this.masterKey) {
      this.initialize();
    }

    try {
      // Create user-specific key derivation
      const userSalt = this.createUserSalt(userId);
      const derivedKey = this.deriveKey(this.masterKey!, userSalt);
      
      // Generate random IV for this encryption
      const iv = randomBytes(IV_LENGTH);
      
      // Serialize credentials
      const credentialData = JSON.stringify(credentials);
      
      // Create cipher
      const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
      
      // Encrypt
      let encrypted = cipher.update(credentialData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine encrypted data with tag
      const encryptedWithTag = encrypted + tag.toString('hex');
      
      return {
        encrypted_data: encryptedWithTag,
        iv: iv.toString('hex'),
        service_type: serviceType,
        last_tested: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt user credentials for use
   */
  static async decryptCredentials(
    encryptedCredentials: EncryptedCredentials,
    userId: string
  ): Promise<any> {
    if (!this.masterKey) {
      this.initialize();
    }

    try {
      // Recreate user-specific key
      const userSalt = this.createUserSalt(userId);
      const derivedKey = this.deriveKey(this.masterKey!, userSalt);
      
      // Parse IV
      const iv = Buffer.from(encryptedCredentials.iv, 'hex');
      
      // Separate encrypted data and tag
      const encryptedWithTag = encryptedCredentials.encrypted_data;
      const tagStart = encryptedWithTag.length - (TAG_LENGTH * 2); // hex encoding doubles length
      const encrypted = encryptedWithTag.slice(0, tagStart);
      const tag = Buffer.from(encryptedWithTag.slice(tagStart), 'hex');
      
      // Create decipher
      const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
      
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Test if credentials can be decrypted (without decrypting)
   */
  static async validateEncryptedCredentials(
    encryptedCredentials: EncryptedCredentials,
    userId: string
  ): Promise<boolean> {
    try {
      await this.decryptCredentials(encryptedCredentials, userId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Re-encrypt credentials with a new key (for key rotation)
   */
  static async rotateCredentials(
    encryptedCredentials: EncryptedCredentials,
    userId: string,
    newMasterKey: string
  ): Promise<EncryptedCredentials> {
    // Decrypt with old key
    const credentials = await this.decryptCredentials(encryptedCredentials, userId);
    
    // Temporarily set new key
    const oldKey = this.masterKey;
    this.masterKey = newMasterKey;
    
    try {
      // Encrypt with new key
      const newEncrypted = await this.encryptCredentials(
        credentials,
        encryptedCredentials.service_type,
        userId
      );
      
      return newEncrypted;
    } finally {
      // Restore old key in case of error
      this.masterKey = oldKey;
    }
  }

  /**
   * Generate a secure master key
   */
  private static generateMasterKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Create a user-specific salt for key derivation
   */
  private static createUserSalt(userId: string): Buffer {
    // Create deterministic salt based on user ID
    // This ensures the same user always gets the same derived key
    const hash = createHash('sha256');
    hash.update(userId);
    hash.update('everjust-credential-salt'); // App-specific salt
    return hash.digest();
  }

  /**
   * Derive an encryption key from master key and user salt
   */
  private static deriveKey(masterKey: string, salt: Buffer): Buffer {
    const hash = createHash('sha256');
    hash.update(Buffer.from(masterKey, 'hex'));
    hash.update(salt);
    return hash.digest();
  }

  /**
   * Securely clear a credential object from memory
   */
  static clearCredentials(credentials: any): void {
    if (typeof credentials === 'object' && credentials !== null) {
      Object.keys(credentials).forEach(key => {
        if (typeof credentials[key] === 'string') {
          // Overwrite string with random data
          credentials[key] = randomBytes(credentials[key].length).toString('hex');
        }
        delete credentials[key];
      });
    }
  }

  /**
   * Get encryption metadata (for debugging/monitoring)
   */
  static getEncryptionInfo(): {
    algorithm: string;
    keySize: number;
    ivSize: number;
    tagSize: number;
    initialized: boolean;
  } {
    return {
      algorithm: ALGORITHM,
      keySize: 256,
      ivSize: IV_LENGTH * 8,
      tagSize: TAG_LENGTH * 8,
      initialized: !!this.masterKey
    };
  }
}

/**
 * Credential validation helpers
 */
export class CredentialValidator {
  
  /**
   * Validate Supabase credentials
   */
  static validateSupabaseCredentials(credentials: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!credentials.project_url) {
      errors.push('Project URL is required');
    } else if (!credentials.project_url.includes('supabase.co')) {
      errors.push('Invalid Supabase project URL format');
    }
    
    if (!credentials.anon_key) {
      errors.push('Anonymous key is required');
    } else if (!credentials.anon_key.startsWith('eyJ')) {
      errors.push('Invalid anonymous key format (should be JWT)');
    }
    
    if (!credentials.project_ref) {
      errors.push('Project reference is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate Firebase credentials
   */
  static validateFirebaseCredentials(credentials: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!credentials.project_id) {
      errors.push('Project ID is required');
    }
    
    if (!credentials.private_key) {
      errors.push('Private key is required');
    } else if (!credentials.private_key.includes('BEGIN PRIVATE KEY')) {
      errors.push('Invalid private key format');
    }
    
    if (!credentials.client_email) {
      errors.push('Client email is required');
    } else if (!credentials.client_email.includes('@')) {
      errors.push('Invalid client email format');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate MongoDB credentials
   */
  static validateMongoDBCredentials(credentials: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!credentials.connection_string) {
      errors.push('Connection string is required');
    } else if (!credentials.connection_string.startsWith('mongodb')) {
      errors.push('Invalid MongoDB connection string format');
    }
    
    if (!credentials.database_name) {
      errors.push('Database name is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate PostgreSQL credentials
   */
  static validatePostgreSQLCredentials(credentials: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!credentials.host) {
      errors.push('Host is required');
    }
    
    if (!credentials.database) {
      errors.push('Database name is required');
    }
    
    if (!credentials.username) {
      errors.push('Username is required');
    }
    
    if (!credentials.password) {
      errors.push('Password is required');
    }
    
    if (credentials.port && (isNaN(credentials.port) || credentials.port < 1 || credentials.port > 65535)) {
      errors.push('Invalid port number');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate credentials based on service type
   */
  static validate(serviceType: string, credentials: any): { valid: boolean; errors: string[] } {
    switch (serviceType) {
      case 'supabase':
        return this.validateSupabaseCredentials(credentials);
      case 'firebase':
        return this.validateFirebaseCredentials(credentials);
      case 'mongodb':
        return this.validateMongoDBCredentials(credentials);
      case 'postgresql':
        return this.validatePostgreSQLCredentials(credentials);
      default:
        return { valid: false, errors: [`Unsupported service type: ${serviceType}`] };
    }
  }
}

// Initialize encryption service on import
CredentialEncryption.initialize();