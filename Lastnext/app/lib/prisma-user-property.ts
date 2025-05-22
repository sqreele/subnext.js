import { prisma } from "@/app/lib/prisma";
import { Property } from "@/app/lib/types";

/**
 * Custom error class for property-related database operations
 */
export class PropertyDatabaseError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'PropertyDatabaseError';
  }
}

/**
 * Validates user ID format and existence
 */
function validateUserId(userId: string): void {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new PropertyDatabaseError('Invalid user ID provided', 'validation');
  }
}

/**
 * Validates property ID format
 */
function validatePropertyId(propertyId: string): void {
  if (!propertyId || typeof propertyId !== 'string' || propertyId.trim().length === 0) {
    throw new PropertyDatabaseError('Invalid property ID provided', 'validation');
  }
}

/**
 * Safe date converter that handles various date formats
 */
function safeDateToISO(date: any): string {
  try {
    if (!date) return new Date().toISOString();
    
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }
    
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    }
    
    if (typeof date === 'object' && date !== null && typeof date.toISOString === 'function') {
      return date.toISOString();
    }
    
    return new Date().toISOString();
  } catch (error) {
    console.warn('Date conversion failed, using current date:', error);
    return new Date().toISOString();
  }
}

/**
 * Converts raw database property to application Property type
 */
function convertToProperty(prop: any): Property {
  return {
    id: prop.id,
    property_id: String(prop.id),
    name: prop.name || `Property ${prop.id}`,
    description: prop.description || "",
    created_at: safeDateToISO(prop.created_at),
  };
}

/**
 * Fetch user's properties directly from the database using the many-to-many relationship
 * This handles properties through UserProperty join table
 * @param userId - The ID of the user whose properties to fetch
 * @returns Promise<Property[]> Array of properties belonging to the user
 * @throws PropertyDatabaseError When database operation fails or user ID is invalid
 */
export async function getUserProperties(userId: string): Promise<Property[]> {
  try {
    validateUserId(userId);

    console.log(`Fetching properties for user: ${userId}`);

    // Attempt to get properties through raw SQL query first
    const result = await prisma.$queryRaw`
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.created_at
      FROM 
        "Property" p
      JOIN 
        "UserProperty" up ON p.id = up."propertyId"
      WHERE 
        up."userId" = ${userId}
    `;

    // The result is an array of raw DB objects
    if (Array.isArray(result) && result.length > 0) {
      console.log(`Found ${result.length} properties via raw query`);
      return result.map(convertToProperty);
    }
    
    console.log('Raw query returned no results, trying Prisma query...');
    
    // Fallback: Query through the join table directly
    const propertiesFromJoin = await prisma.userProperty.findMany({
      where: { userId: userId },
      include: { property: true },
    });

    if (Array.isArray(propertiesFromJoin) && propertiesFromJoin.length > 0) {
      console.log(`Found ${propertiesFromJoin.length} properties via Prisma query`);
      return propertiesFromJoin.map((relation) => convertToProperty(relation.property));
    }
    
    console.log('No properties found for user');
    return [];
  } catch (error) {
    console.error("Error fetching user properties:", error);
    
    if (error instanceof PropertyDatabaseError) {
      throw error;
    }
    
    // Check for specific database errors
    if (error && typeof error === 'object') {
      const errorMessage = (error as any).message || 'Unknown database error';
      
      if (errorMessage.includes('connect') || errorMessage.includes('timeout')) {
        throw new PropertyDatabaseError(
          'Database connection failed. Please try again later.',
          'getUserProperties',
          error
        );
      }
      
      if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        throw new PropertyDatabaseError(
          'Database access denied. Please check your permissions.',
          'getUserProperties',
          error
        );
      }
      
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        throw new PropertyDatabaseError(
          'User or property table not found in database.',
          'getUserProperties',
          error
        );
      }
    }
    
    throw new PropertyDatabaseError(
      'Failed to fetch user properties from database.',
      'getUserProperties',
      error
    );
  }
}

/**
 * Associate a user with a property
 * This will handle the many-to-many relationship
 * @param userId - The ID of the user to associate
 * @param propertyId - The ID of the property to associate
 * @returns Promise<void>
 * @throws PropertyDatabaseError When database operation fails or IDs are invalid
 */
export async function addUserToProperty(userId: string, propertyId: string): Promise<void> {
  try {
    validateUserId(userId);
    validatePropertyId(propertyId);

    console.log(`Adding user ${userId} to property ${propertyId}`);

    // Check if the relationship already exists
    const existingRelation = await prisma.userProperty.findUnique({
      where: {
        userId_propertyId: {
          userId: userId,
          propertyId: propertyId
        }
      }
    });

    // If it already exists, we're done
    if (existingRelation) {
      console.log('User-property relationship already exists');
      return;
    }

    // Verify that both user and property exist before creating relationship
    const [userExists, propertyExists] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } }),
    ]);

    if (!userExists) {
      throw new PropertyDatabaseError(
        `User with ID ${userId} does not exist`,
        'addUserToProperty'
      );
    }

    if (!propertyExists) {
      throw new PropertyDatabaseError(
        `Property with ID ${propertyId} does not exist`,
        'addUserToProperty'
      );
    }

    // Create the relationship
    await prisma.userProperty.create({
      data: {
        userId: userId,
        propertyId: propertyId
      }
    });

    console.log('User-property relationship created successfully');
  } catch (error) {
    console.error("Error adding user to property:", error);
    
    if (error instanceof PropertyDatabaseError) {
      throw error;
    }
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object') {
      const errorMessage = (error as any).message || 'Unknown database error';
      
      if (errorMessage.includes('Unique constraint failed')) {
        // This shouldn't happen due to our check, but just in case
        console.log('Relationship already exists (constraint error)');
        return;
      }
      
      if (errorMessage.includes('Foreign key constraint failed')) {
        throw new PropertyDatabaseError(
          'Cannot create relationship: User or Property does not exist.',
          'addUserToProperty',
          error
        );
      }
    }
    
    throw new PropertyDatabaseError(
      'Failed to add user to property.',
      'addUserToProperty',
      error
    );
  }
}

/**
 * Create a new property and associate it with a user
 * @param userId - The ID of the user to associate with the new property
 * @param propertyData - Object containing property name and optional description
 * @returns Promise<Property> The created property
 * @throws PropertyDatabaseError When database operation fails or data is invalid
 */
export async function createPropertyForUser(
  userId: string, 
  propertyData: { name: string; description?: string }
): Promise<Property> {
  try {
    validateUserId(userId);
    
    if (!propertyData.name || typeof propertyData.name !== 'string' || propertyData.name.trim().length === 0) {
      throw new PropertyDatabaseError('Property name is required', 'createPropertyForUser');
    }

    const trimmedName = propertyData.name.trim();
    const trimmedDescription = propertyData.description?.trim() || null;

    console.log(`Creating property "${trimmedName}" for user ${userId}`);

    // Verify user exists
    const userExists = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { id: true } 
    });

    if (!userExists) {
      throw new PropertyDatabaseError(
        `User with ID ${userId} does not exist`,
        'createPropertyForUser'
      );
    }

    // Use a transaction to ensure both property creation and relationship creation succeed
    const result = await prisma.$transaction(async (tx) => {
      // Create the property
      const newProperty = await tx.property.create({
        data: {
          name: trimmedName,
          description: trimmedDescription,
        },
      });

      // Create the user-property relationship
      await tx.userProperty.create({
        data: {
          userId: userId,
          propertyId: newProperty.id
        }
      });

      return newProperty;
    });

    console.log(`Property created successfully with ID: ${result.id}`);

    return convertToProperty(result);
  } catch (error) {
    console.error("Error creating property for user:", error);
    
    if (error instanceof PropertyDatabaseError) {
      throw error;
    }
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object') {
      const errorMessage = (error as any).message || 'Unknown database error';
      
      if (errorMessage.includes('Unique constraint failed')) {
        throw new PropertyDatabaseError(
          'A property with this name already exists.',
          'createPropertyForUser',
          error
        );
      }
      
      if (errorMessage.includes('Foreign key constraint failed')) {
        throw new PropertyDatabaseError(
          'Cannot create property: User does not exist.',
          'createPropertyForUser',
          error
        );
      }
    }
    
    throw new PropertyDatabaseError(
      'Failed to create property.',
      'createPropertyForUser',
      error
    );
  }
}

/**
 * Synchronize properties from API to the local database
 * @param userId - The ID of the user to sync properties for
 * @param apiProperties - Array of property data from API
 * @returns Promise<Property[]> Array of synchronized properties
 * @throws PropertyDatabaseError When database operation fails
 */
export async function syncUserProperties(
  userId: string, 
  apiProperties: any[]
): Promise<Property[]> {
  try {
    validateUserId(userId);

    if (!apiProperties || !Array.isArray(apiProperties) || apiProperties.length === 0) {
      console.log('No API properties to sync');
      return [];
    }

    console.log(`Syncing ${apiProperties.length} properties for user ${userId}`);

    // Verify user exists
    const userExists = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { id: true } 
    });

    if (!userExists) {
      throw new PropertyDatabaseError(
        `User with ID ${userId} does not exist`,
        'syncUserProperties'
      );
    }

    // Validate API properties data
    const validProperties = apiProperties.filter((prop, index) => {
      const propertyId = prop?.property_id || prop?.id;
      if (!propertyId) {
        console.warn(`Skipping property at index ${index}: missing ID`);
        return false;
      }
      return true;
    });

    if (validProperties.length === 0) {
      console.log('No valid properties to sync');
      return [];
    }

    // Use transaction for consistency
    const results = await prisma.$transaction(async (tx) => {
      const propertyPromises = validProperties.map(async (prop) => {
        try {
          const propertyId = String(prop.property_id || prop.id);
          const name = (prop.name || `Property ${propertyId}`).trim();
          const description = prop.description?.trim() || null;
          
          // Upsert the property
          const property = await tx.property.upsert({
            where: { id: propertyId },
            update: {
              name,
              description,
            },
            create: {
              id: propertyId,
              name,
              description,
            },
          });

          // Check if the relationship exists
          const existingRelation = await tx.userProperty.findUnique({
            where: {
              userId_propertyId: {
                userId: userId,
                propertyId: property.id
              }
            }
          });

          // If relationship doesn't exist, create it
          if (!existingRelation) {
            await tx.userProperty.create({
              data: {
                userId: userId,
                propertyId: property.id
              }
            });
          }

          return property;
        } catch (propError) {
          console.error(`Error syncing property ${prop.property_id || prop.id}:`, propError);
          throw propError;
        }
      });

      return await Promise.all(propertyPromises);
    });

    console.log(`Successfully synced ${results.length} properties`);
    
    // Convert to our application Property type
    return results.map(convertToProperty);
  } catch (error) {
    console.error("Error syncing user properties:", error);
    
    if (error instanceof PropertyDatabaseError) {
      throw error;
    }
    
    // Handle specific database errors
    if (error && typeof error === 'object') {
      const errorMessage = (error as any).message || 'Unknown database error';
      
      if (errorMessage.includes('Transaction failed')) {
        throw new PropertyDatabaseError(
          'Failed to sync properties: Database transaction failed.',
          'syncUserProperties',
          error
        );
      }
      
      if (errorMessage.includes('timeout')) {
        throw new PropertyDatabaseError(
          'Property synchronization timed out. Please try again.',
          'syncUserProperties',
          error
        );
      }
    }
    
    throw new PropertyDatabaseError(
      'Failed to synchronize properties.',
      'syncUserProperties',
      error
    );
  }
}

/**
 * Remove a user from a property (delete the relationship)
 * @param userId - The ID of the user to remove
 * @param propertyId - The ID of the property to remove user from
 * @returns Promise<void>
 * @throws PropertyDatabaseError When database operation fails
 */
export async function removeUserFromProperty(userId: string, propertyId: string): Promise<void> {
  try {
    validateUserId(userId);
    validatePropertyId(propertyId);

    console.log(`Removing user ${userId} from property ${propertyId}`);

    const deletedRelation = await prisma.userProperty.deleteMany({
      where: {
        userId: userId,
        propertyId: propertyId
      }
    });

    if (deletedRelation.count === 0) {
      console.log('No relationship found to delete');
    } else {
      console.log('User-property relationship removed successfully');
    }
  } catch (error) {
    console.error("Error removing user from property:", error);
    
    if (error instanceof PropertyDatabaseError) {
      throw error;
    }
    
    throw new PropertyDatabaseError(
      'Failed to remove user from property.',
      'removeUserFromProperty',
      error
    );
  }
}

/**
 * Get all properties (admin function)
 * @returns Promise<Property[]> Array of all properties in the system
 * @throws PropertyDatabaseError When database operation fails
 */
export async function getAllProperties(): Promise<Property[]> {
  try {
    console.log('Fetching all properties');

    const properties = await prisma.property.findMany({
      orderBy: { created_at: 'desc' }
    });

    console.log(`Found ${properties.length} total properties`);

    return properties.map(convertToProperty);
  } catch (error) {
    console.error("Error fetching all properties:", error);
    
    throw new PropertyDatabaseError(
      'Failed to fetch all properties.',
      'getAllProperties',
      error
    );
  }
}

/**
 * Check if a user has access to a specific property
 * @param userId - The ID of the user to check
 * @param propertyId - The ID of the property to check access for
 * @returns Promise<boolean> True if user has access, false otherwise
 */
export async function userHasPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  try {
    validateUserId(userId);
    validatePropertyId(propertyId);

    const relation = await prisma.userProperty.findUnique({
      where: {
        userId_propertyId: {
          userId: userId,
          propertyId: propertyId
        }
      }
    });

    return !!relation;
  } catch (error) {
    console.error("Error checking user property access:", error);
    return false; // Fail securely - deny access if we can't verify
  }
}