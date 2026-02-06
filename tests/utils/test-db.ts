import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach } from "vitest";

// Create a test-specific Prisma client
let prisma: PrismaClient;

/**
 * Initialize the test database connection
 * Use TEST_DATABASE_URL environment variable for test database
 */
export function getTestPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
      log: process.env.DEBUG ? ["query", "error", "warn"] : ["error"],
    });
  }
  return prisma;
}

/**
 * Setup hooks for database testing
 * Handles connection lifecycle and cleanup
 */
export function setupTestDatabase() {
  beforeAll(async () => {
    prisma = getTestPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData();
  });
}

/**
 * Clean up test data from all tables
 * Order matters due to foreign key constraints
 */
export async function cleanupTestData() {
  const prismaClient = getTestPrismaClient();

  // Delete in order of dependencies (child tables first)
  const tablesToClean = [
    "documentAccessLog",
    "documentComment",
    "documentShare",
    "document",
    "documentTemplate",
    "milestone",
    "missionPhase",
    "deadline",
    "notificationLog",
    "auditLog",
    "authorizationDocument",
    "authorizationWorkflow",
    "session",
    "account",
    "verificationToken",
    // Don't delete users to avoid foreign key issues
  ];

  for (const table of tablesToClean) {
    try {
      // @ts-expect-error - Dynamic table access
      await prismaClient[table]?.deleteMany({});
    } catch {
      // Table might not exist, skip
    }
  }
}

/**
 * Create a test user for integration tests
 */
export async function createTestUser(
  data?: Partial<TestUserData>,
): Promise<TestUserData> {
  const prismaClient = getTestPrismaClient();

  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    name: "Test User",
    role: "USER" as const,
    organizationName: "Test Organization",
  };

  const userData = { ...defaultUser, ...data };

  const user = await prismaClient.user.create({
    data: userData,
  });

  return user as TestUserData;
}

export interface TestUserData {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN" | "AUTHORITY";
  organizationName?: string;
}

/**
 * Create test documents for a user
 */
export async function createTestDocuments(
  userId: string,
  count: number = 1,
  overrides?: Record<string, unknown>,
): Promise<unknown[]> {
  const prismaClient = getTestPrismaClient();
  const documents = [];

  for (let i = 0; i < count; i++) {
    const doc = await prismaClient.document.create({
      data: {
        userId,
        name: `Test Document ${i + 1}`,
        fileName: `test-document-${i + 1}.pdf`,
        fileSize: 1024,
        mimeType: "application/pdf",
        storagePath: `/test/documents/test-document-${i + 1}.pdf`,
        checksum: `test-checksum-${Date.now()}-${i}`,
        uploadedBy: userId,
        category: "LICENSE",
        status: "ACTIVE",
        isLatest: true,
        version: 1,
        ...overrides,
      },
    });
    documents.push(doc);
  }

  return documents;
}

/**
 * Create test deadlines for a user
 */
export async function createTestDeadlines(
  userId: string,
  count: number = 1,
  overrides?: Record<string, unknown>,
): Promise<unknown[]> {
  const prismaClient = getTestPrismaClient();
  const deadlines = [];

  for (let i = 0; i < count; i++) {
    const deadline = await prismaClient.deadline.create({
      data: {
        userId,
        title: `Test Deadline ${i + 1}`,
        dueDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        category: "REGULATORY",
        priority: "MEDIUM",
        status: "UPCOMING",
        reminderDays: [7, 1],
        ...overrides,
      },
    });
    deadlines.push(deadline);
  }

  return deadlines;
}

/**
 * Create a test authorization workflow for a user
 * Note: ComplianceTracker model was replaced with AuthorizationWorkflow
 */
export async function createTestAuthorizationWorkflow(
  userId: string,
  overrides?: Record<string, unknown>,
): Promise<unknown> {
  const prismaClient = getTestPrismaClient();

  return prismaClient.authorizationWorkflow.create({
    data: {
      userId,
      status: "not_started",
      operatorType: "SCO",
      primaryNCA: "de",
      primaryNCAName: "German Space Agency (DLR)",
      pathway: "national_authorization",
      ...overrides,
    },
  });
}

/**
 * Seed the test database with common test data
 */
export async function seedTestDatabase(): Promise<{
  user: TestUserData;
  documents: unknown[];
  deadlines: unknown[];
}> {
  const user = await createTestUser();
  const documents = await createTestDocuments(user.id, 5);
  const deadlines = await createTestDeadlines(user.id, 3);

  return { user, documents, deadlines };
}

/**
 * Transaction wrapper for test isolation
 * Rolls back all changes after the test
 */
export async function withTestTransaction<T>(
  callback: (prisma: PrismaClient) => Promise<T>,
): Promise<T> {
  const prismaClient = getTestPrismaClient();

  return prismaClient
    .$transaction(async (tx) => {
      const result = await callback(tx as unknown as PrismaClient);
      // This will be rolled back due to the transaction
      throw new RollbackError(result);
    })
    .catch((error) => {
      if (error instanceof RollbackError) {
        return error.result as T;
      }
      throw error;
    });
}

class RollbackError extends Error {
  constructor(public result: unknown) {
    super("Transaction rollback");
  }
}
