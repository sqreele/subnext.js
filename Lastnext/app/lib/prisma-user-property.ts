import { prisma } from "@/app/lib/prisma";
import { Property } from "@/app/lib/types";

/**
 * Fetch user's properties directly from the database using the many-to-many relationship
 * This handles both direct properties relation and through UserProperty join table
 */
export async function getUserProperties(userId: string): Promise<Property[]> {
  try {
    // Attempt to get properties through direct relationship
    // We need to be careful about the structure expected by TypeScript
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
      return result.map((prop: any) => ({
        id: String(prop.id),
        property_id: String(prop.id),
        name: prop.name || `Property ${prop.id}`,
        description: prop.description || "",
        created_at: typeof prop.created_at === 'object' && prop.created_at !== null 
          ? prop.created_at.toISOString() 
          : (prop.created_at || new Date().toISOString()),
        users: [],
      }));
    }
    
    // Fallback to direct properties if the raw query didn't work
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        properties: true,
      },
    });

    if (!user || !user.properties || !Array.isArray(user.properties)) {
      return [];
    }

    return user.properties.map((prop: any) => ({
      id: String(prop.id),
      property_id: String(prop.id),
      name: prop.name || `Property ${prop.id}`,
      description: prop.description || "",
      created_at: typeof prop.created_at === 'object' && prop.created_at !== null 
        ? prop.created_at.toISOString() 
        : (prop.created_at || new Date().toISOString()),
      users: [],
    }));
  } catch (error) {
    console.error("Error fetching user properties:", error);
    return [];
  }
}

/**
 * Associate a user with a property
 * This will handle the many-to-many relationship
 */
export async function addUserToProperty(userId: string, propertyId: string): Promise<void> {
  // First check if the relationship already exists
  const existingRelation = await prisma.userProperty.findUnique({
    where: {
      userId_propertyId: {
        userId: userId,
        propertyId: propertyId
      }
    }
  });

  // If it doesn't exist, create it
  if (!existingRelation) {
    await prisma.userProperty.create({
      data: {
        userId: userId,
        propertyId: propertyId
      }
    });
  }
}

/**
 * Create a new property and associate it with a user
 */
export async function createPropertyForUser(
  userId: string, 
  propertyData: { name: string; description?: string }
): Promise<Property> {
  // Create the property
  const newProperty = await prisma.property.create({
    data: {
      name: propertyData.name,
      description: propertyData.description || null,
    },
  });

  // Create the relationship manually
  await prisma.userProperty.create({
    data: {
      userId: userId,
      propertyId: newProperty.id
    }
  });

  return {
    id: newProperty.id,
    property_id: newProperty.id,
    name: newProperty.name || `Property ${newProperty.id}`,
    description: newProperty.description || "",
    created_at: typeof newProperty.created_at === 'object' && newProperty.created_at !== null 
      ? newProperty.created_at.toISOString()
      : (newProperty.created_at || new Date().toISOString()),
    users: [],
  };
}

/**
 * Synchronize properties from API to the local database
 */
export async function syncUserProperties(
  userId: string, 
  apiProperties: any[]
): Promise<Property[]> {
  if (!apiProperties || !apiProperties.length) {
    return [];
  }

  // First, create or update all properties from the API
  const propertyPromises = apiProperties.map(async (prop) => {
    const propertyId = String(prop.property_id || prop.id);
    const name = prop.name || `Property ${propertyId}`;
    
    // Upsert the property
    const property = await prisma.property.upsert({
      where: { id: propertyId },
      update: {
        name,
        description: prop.description || null,
      },
      create: {
        id: propertyId,
        name,
        description: prop.description || null,
      },
    });

    // Check if the relationship exists
    const existingRelation = await prisma.userProperty.findUnique({
      where: {
        userId_propertyId: {
          userId: userId,
          propertyId: property.id
        }
      }
    });

    // If relationship doesn't exist, create it
    if (!existingRelation) {
      await prisma.userProperty.create({
        data: {
          userId: userId,
          propertyId: property.id
        }
      });
    }

    return property;
  });

  // Wait for all property operations to complete
  const results = await Promise.all(propertyPromises);
  
  // Convert to our application Property type
  return results.map(prop => ({
    id: prop.id,
    property_id: prop.id,
    name: prop.name || `Property ${prop.id}`,
    description: prop.description || "",
    created_at: typeof prop.created_at === 'object' && prop.created_at !== null 
      ? prop.created_at.toISOString()
      : (prop.created_at || new Date().toISOString()),
    users: [],
  }));
}
