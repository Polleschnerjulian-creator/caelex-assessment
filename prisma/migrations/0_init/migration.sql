-- CreateEnum
CREATE TYPE "DeadlineCategory" AS ENUM ('REGULATORY', 'LICENSE', 'REPORTING', 'INSURANCE', 'CERTIFICATION', 'MISSION', 'INTERNAL', 'CONTRACTUAL');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('UPCOMING', 'DUE_SOON', 'OVERDUE', 'COMPLETED', 'CANCELLED', 'EXTENDED');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('AUTHORIZATION', 'DEBRIS', 'INSURANCE', 'CYBERSECURITY', 'ENVIRONMENTAL', 'SUPERVISION', 'REGISTRATION', 'TIMELINE', 'DOCUMENTS', 'NIS2');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('LICENSE', 'PERMIT', 'AUTHORIZATION', 'CERTIFICATE', 'ISO_CERTIFICATE', 'SECURITY_CERT', 'INSURANCE_POLICY', 'INSURANCE_CERT', 'COMPLIANCE_REPORT', 'AUDIT_REPORT', 'INCIDENT_REPORT', 'ANNUAL_REPORT', 'TECHNICAL_SPEC', 'DESIGN_DOC', 'TEST_REPORT', 'SAFETY_ANALYSIS', 'CONTRACT', 'NDA', 'SLA', 'REGULATORY_FILING', 'CORRESPONDENCE', 'NOTIFICATION', 'POLICY', 'PROCEDURE', 'TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'UNDER_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'EXPIRED', 'SUPERSEDED', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'TOP_SECRET');

-- CreateEnum
CREATE TYPE "AccessAction" AS ENUM ('VIEW', 'DOWNLOAD', 'PRINT', 'SHARE', 'EDIT', 'DELETE', 'RESTORE', 'VERSION_CREATED', 'PERMISSION_CHANGED', 'COMMENT_ADDED');

-- CreateEnum
CREATE TYPE "ShareAccessType" AS ENUM ('VIEW_ONLY', 'DOWNLOAD', 'COMMENT', 'EDIT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEADLINE_REMINDER', 'DEADLINE_APPROACHING', 'DEADLINE_OVERDUE', 'DOCUMENT_EXPIRY', 'COMPLIANCE_GAP', 'COMPLIANCE_SCORE_DROPPED', 'COMPLIANCE_ACTION_REQUIRED', 'COMPLIANCE_UPDATED', 'AUTHORIZATION_UPDATE', 'WORKFLOW_STATUS_CHANGED', 'DOCUMENT_REQUIRED', 'AUTHORIZATION_APPROVED', 'AUTHORIZATION_REJECTED', 'INCIDENT_ALERT', 'INCIDENT_CREATED', 'INCIDENT_ESCALATED', 'INCIDENT_RESOLVED', 'NCA_DEADLINE_APPROACHING', 'WEEKLY_DIGEST', 'REPORT_GENERATED', 'REPORT_SUBMITTED', 'REPORT_FAILED', 'NCA_ACKNOWLEDGED', 'MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_ROLE_CHANGED', 'INVITATION_RECEIVED', 'SPACECRAFT_STATUS_CHANGED', 'SPACECRAFT_ADDED', 'SYSTEM_UPDATE', 'SYSTEM_MAINTENANCE', 'NIS2_DEADLINE_APPROACHING', 'NIS2_ASSESSMENT_UPDATED', 'NCA_STATUS_CHANGED', 'NCA_RESPONSE_RECEIVED', 'NCA_FOLLOW_UP_REQUIRED', 'BREACH_REPORTED', 'BREACH_ESCALATED', 'BREACH_AUTHORITY_DEADLINE');

-- CreateEnum
CREATE TYPE "ScheduledReportType" AS ENUM ('COMPLIANCE_SUMMARY', 'MONTHLY_DIGEST', 'QUARTERLY_REVIEW', 'ANNUAL_COMPLIANCE', 'INCIDENT_DIGEST', 'AUTHORIZATION_STATUS', 'DOCUMENT_INVENTORY', 'DEADLINE_FORECAST', 'AUDIT_TRAIL', 'COMPLIANCE_CERTIFICATE');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'CSV', 'JSON', 'XLSX');

-- CreateEnum
CREATE TYPE "NCAAuthority" AS ENUM ('DE_BMWK', 'DE_DLR', 'FR_CNES', 'FR_DGAC', 'IT_ASI', 'ES_AEE', 'NL_NSO', 'BE_BELSPO', 'AT_FFG', 'PL_POLSA', 'SE_SNSA', 'DK_DTU', 'FI_BF', 'PT_FCT', 'IE_EI', 'LU_LSA', 'CZ_CSO', 'RO_ROSA', 'GR_HSA', 'EUSPA', 'EC_DEFIS', 'OTHER');

-- CreateEnum
CREATE TYPE "SubmissionMethod" AS ENUM ('PORTAL', 'EMAIL', 'API', 'REGISTERED_MAIL', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "NCASubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RECEIVED', 'UNDER_REVIEW', 'INFORMATION_REQUESTED', 'ACKNOWLEDGED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "SubmissionPriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "CorrespondenceDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('EMAIL', 'LETTER', 'PORTAL_MSG', 'PHONE_CALL', 'MEETING_NOTE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "OrganizationPlan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "SpacecraftStatus" AS ENUM ('PRE_LAUNCH', 'LAUNCHED', 'OPERATIONAL', 'DECOMMISSIONING', 'DEORBITED', 'LOST');

-- CreateEnum
CREATE TYPE "SpaceObjectType" AS ENUM ('SATELLITE', 'SPACE_STATION', 'SPACE_PROBE', 'CREWED_SPACECRAFT', 'LAUNCH_VEHICLE_STAGE', 'DEBRIS', 'OTHER');

-- CreateEnum
CREATE TYPE "OrbitalRegime" AS ENUM ('LEO', 'MEO', 'GEO', 'HEO', 'SSO', 'POLAR', 'BEYOND');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'PENDING_SUBMISSION', 'SUBMITTED', 'UNDER_REVIEW', 'REGISTERED', 'AMENDMENT_REQUIRED', 'AMENDMENT_PENDING', 'DEREGISTERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SSOProvider" AS ENUM ('SAML', 'OIDC', 'AZURE_AD', 'OKTA', 'GOOGLE_WORKSPACE');

-- CreateEnum
CREATE TYPE "LoginEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'MFA_REQUIRED', 'MFA_SUCCESS', 'MFA_FAILED', 'PASSKEY_SUCCESS', 'PASSKEY_FAILED', 'BACKUP_CODE_USED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'SUSPICIOUS_LOGIN');

-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('PASSKEY', 'PASSWORD', 'OAUTH_GOOGLE', 'OAUTH_GITHUB', 'SAML', 'OIDC', 'API_KEY');

-- CreateEnum
CREATE TYPE "SecurityAuditEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'LOGOUT', 'SESSION_CREATED', 'SESSION_REVOKED', 'SESSION_EXPIRED', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'MFA_ENABLED', 'MFA_DISABLED', 'MFA_CHALLENGE_SUCCESS', 'MFA_CHALLENGE_FAILED', 'MFA_BACKUP_CODES_GENERATED', 'MFA_BACKUP_CODE_USED', 'PASSKEY_REGISTERED', 'PASSKEY_REMOVED', 'PASSKEY_LOGIN_SUCCESS', 'PASSKEY_LOGIN_FAILED', 'SSO_LOGIN', 'SSO_CONFIGURED', 'SSO_UPDATED', 'SSO_DISABLED', 'SSO_TEST_SUCCESS', 'SSO_TEST_FAILED', 'API_KEY_CREATED', 'API_KEY_USED', 'API_KEY_REVOKED', 'API_KEY_EXPIRED', 'API_KEY_ROTATED', 'API_KEY_ROTATION_COMPLETED', 'ACCOUNT_CREATED', 'ACCOUNT_UPDATED', 'ACCOUNT_DELETED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'EMAIL_CHANGED', 'EMAIL_VERIFIED', 'ORG_MEMBER_ADDED', 'ORG_MEMBER_REMOVED', 'ORG_MEMBER_ROLE_CHANGED', 'ORG_SETTINGS_CHANGED', 'ORG_BILLING_UPDATED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'ROLE_CHANGED', 'SUSPICIOUS_ACTIVITY', 'BRUTE_FORCE_DETECTED', 'UNUSUAL_LOCATION', 'MULTIPLE_FAILED_LOGINS', 'RATE_LIMIT_EXCEEDED', 'HONEY_TOKEN_TRIGGERED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "HoneyTokenType" AS ENUM ('API_KEY', 'DATABASE_URL', 'AWS_CREDENTIAL', 'OAUTH_SECRET', 'ENCRYPTION_KEY', 'WEBHOOK_SECRET', 'JWT_SECRET', 'SSH_KEY', 'ADMIN_PASSWORD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "RegulationType" AS ENUM ('EU_SPACE_ACT', 'NIS2', 'CYBERSECURITY', 'DEBRIS', 'ENVIRONMENTAL', 'INSURANCE', 'AUTHORIZATION', 'REGISTRATION', 'SUPERVISION', 'NATIONAL_SPACE_LAW');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('DOCUMENT', 'SCREENSHOT', 'ATTESTATION', 'CERTIFICATE', 'LOG_EXTRACT', 'POLICY', 'PROCEDURE', 'TEST_RESULT', 'EXTERNAL_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentGenerationType" AS ENUM ('DEBRIS_MITIGATION_PLAN', 'CYBERSECURITY_FRAMEWORK', 'ENVIRONMENTAL_FOOTPRINT', 'INSURANCE_COMPLIANCE', 'NIS2_ASSESSMENT', 'AUTHORIZATION_APPLICATION');

-- CreateEnum
CREATE TYPE "DocumentGenerationStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BreachSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BreachStatus" AS ENUM ('DETECTED', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "organization" TEXT,
    "operatorType" TEXT,
    "establishmentCountry" TEXT,
    "isThirdCountry" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'en',
    "unifiedAssessmentResult" TEXT,
    "unifiedAssessmentCompletedAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "unlockToken" TEXT,
    "unlockTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "ArticleStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizationWorkflow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryNCA" TEXT NOT NULL,
    "primaryNCAName" TEXT NOT NULL,
    "secondaryNCAs" TEXT,
    "pathway" TEXT NOT NULL,
    "operatorType" TEXT,
    "launchCountry" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "targetSubmission" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorizationWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizationDocument" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "articleRef" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorizationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "entryHash" TEXT,
    "previousHash" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebrisAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionName" TEXT,
    "orbitType" TEXT NOT NULL,
    "altitudeKm" INTEGER,
    "satelliteCount" INTEGER NOT NULL DEFAULT 1,
    "constellationTier" TEXT NOT NULL,
    "hasManeuverability" TEXT NOT NULL,
    "hasPropulsion" BOOLEAN NOT NULL DEFAULT false,
    "hasPassivationCap" BOOLEAN NOT NULL DEFAULT false,
    "plannedDurationYears" INTEGER NOT NULL DEFAULT 5,
    "launchDate" TIMESTAMP(3),
    "deorbitStrategy" TEXT NOT NULL,
    "deorbitTimelineYears" INTEGER,
    "caServiceProvider" TEXT,
    "complianceScore" INTEGER,
    "planGenerated" BOOLEAN NOT NULL DEFAULT false,
    "planGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebrisAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebrisRequirementStatus" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_assessed',
    "notes" TEXT,
    "evidenceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebrisRequirementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CybersecurityAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentName" TEXT,
    "organizationSize" TEXT NOT NULL,
    "employeeCount" INTEGER,
    "annualRevenue" DOUBLE PRECISION,
    "spaceSegmentComplexity" TEXT NOT NULL,
    "satelliteCount" INTEGER,
    "hasGroundSegment" BOOLEAN NOT NULL DEFAULT true,
    "groundStationCount" INTEGER,
    "dataSensitivityLevel" TEXT NOT NULL,
    "processesPersonalData" BOOLEAN NOT NULL DEFAULT false,
    "handlesGovData" BOOLEAN NOT NULL DEFAULT false,
    "existingCertifications" TEXT,
    "hasSecurityTeam" BOOLEAN NOT NULL DEFAULT false,
    "securityTeamSize" INTEGER,
    "hasIncidentResponsePlan" BOOLEAN NOT NULL DEFAULT false,
    "hasBCP" BOOLEAN NOT NULL DEFAULT false,
    "criticalSupplierCount" INTEGER,
    "supplierSecurityAssessed" BOOLEAN NOT NULL DEFAULT false,
    "isSimplifiedRegime" BOOLEAN NOT NULL DEFAULT false,
    "maturityScore" INTEGER,
    "frameworkGenerated" BOOLEAN NOT NULL DEFAULT false,
    "frameworkGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CybersecurityAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CybersecurityRequirementStatus" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_assessed',
    "notes" TEXT,
    "evidenceNotes" TEXT,
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CybersecurityRequirementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NIS2Assessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentName" TEXT,
    "entityClassification" TEXT,
    "classificationReason" TEXT,
    "sector" TEXT,
    "subSector" TEXT,
    "organizationSize" TEXT,
    "employeeCount" INTEGER,
    "annualRevenue" DOUBLE PRECISION,
    "memberStateCount" INTEGER NOT NULL DEFAULT 1,
    "operatesGroundInfra" BOOLEAN NOT NULL DEFAULT false,
    "operatesSatComms" BOOLEAN NOT NULL DEFAULT false,
    "manufacturesSpacecraft" BOOLEAN NOT NULL DEFAULT false,
    "providesLaunchServices" BOOLEAN NOT NULL DEFAULT false,
    "providesEOData" BOOLEAN NOT NULL DEFAULT false,
    "existingCertifications" TEXT,
    "hasISO27001" BOOLEAN NOT NULL DEFAULT false,
    "hasExistingCSIRT" BOOLEAN NOT NULL DEFAULT false,
    "hasRiskManagement" BOOLEAN NOT NULL DEFAULT false,
    "hasDesignatedRepresentative" BOOLEAN NOT NULL DEFAULT false,
    "hasRegisteredWithAuthority" BOOLEAN NOT NULL DEFAULT false,
    "supervisoryAuthority" TEXT,
    "complianceScore" INTEGER,
    "maturityScore" INTEGER,
    "riskLevel" TEXT,
    "euSpaceActOverlapCount" INTEGER,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reportGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NIS2Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NIS2RequirementStatus" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_assessed',
    "notes" TEXT,
    "evidenceNotes" TEXT,
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NIS2RequirementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentName" TEXT,
    "primaryJurisdiction" TEXT NOT NULL,
    "operatorType" TEXT NOT NULL,
    "companySize" TEXT NOT NULL,
    "orbitRegime" TEXT NOT NULL,
    "satelliteCount" INTEGER NOT NULL DEFAULT 1,
    "satelliteValueEur" DOUBLE PRECISION,
    "totalMissionValueEur" DOUBLE PRECISION,
    "isConstellationOperator" BOOLEAN NOT NULL DEFAULT false,
    "hasManeuverability" BOOLEAN NOT NULL DEFAULT false,
    "missionDurationYears" INTEGER NOT NULL DEFAULT 5,
    "hasFlightHeritage" BOOLEAN NOT NULL DEFAULT false,
    "launchVehicle" TEXT,
    "launchProvider" TEXT,
    "launchDate" TIMESTAMP(3),
    "hasADR" BOOLEAN NOT NULL DEFAULT false,
    "hasPropulsion" BOOLEAN NOT NULL DEFAULT false,
    "hasHazardousMaterials" BOOLEAN NOT NULL DEFAULT false,
    "crossBorderOps" BOOLEAN NOT NULL DEFAULT false,
    "annualRevenueEur" DOUBLE PRECISION,
    "turnoversShareSpace" DOUBLE PRECISION,
    "calculatedTPL" DOUBLE PRECISION,
    "riskLevel" TEXT,
    "complianceScore" INTEGER,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reportGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "insuranceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "policyNumber" TEXT,
    "insurer" TEXT,
    "broker" TEXT,
    "coverageAmount" DOUBLE PRECISION,
    "premium" DOUBLE PRECISION,
    "deductible" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "documentUrl" TEXT,
    "documentName" TEXT,
    "notes" TEXT,
    "quoteNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentalAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "missionName" TEXT,
    "operatorType" TEXT NOT NULL,
    "missionType" TEXT NOT NULL,
    "spacecraftMassKg" DOUBLE PRECISION NOT NULL,
    "spacecraftCount" INTEGER NOT NULL DEFAULT 1,
    "orbitType" TEXT NOT NULL,
    "altitudeKm" INTEGER,
    "missionDurationYears" INTEGER NOT NULL DEFAULT 5,
    "launchVehicle" TEXT NOT NULL,
    "launchSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "launchSiteCountry" TEXT,
    "spacecraftPropellant" TEXT,
    "propellantMassKg" DOUBLE PRECISION,
    "groundStationCount" INTEGER NOT NULL DEFAULT 1,
    "dailyContactHours" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "deorbitStrategy" TEXT NOT NULL,
    "isSmallEnterprise" BOOLEAN NOT NULL DEFAULT false,
    "isResearchEducation" BOOLEAN NOT NULL DEFAULT false,
    "totalGWP" DOUBLE PRECISION,
    "totalODP" DOUBLE PRECISION,
    "carbonIntensity" DOUBLE PRECISION,
    "efdGrade" TEXT,
    "complianceScore" INTEGER,
    "isSimplifiedAssessment" BOOLEAN NOT NULL DEFAULT false,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reportGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvironmentalAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentalImpactResult" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "gwpKgCO2eq" DOUBLE PRECISION NOT NULL,
    "odpKgCFC11eq" DOUBLE PRECISION NOT NULL,
    "percentOfTotal" DOUBLE PRECISION NOT NULL,
    "acidificationMolHEq" DOUBLE PRECISION,
    "eutrophicationFwKgPEq" DOUBLE PRECISION,
    "waterUseM3" DOUBLE PRECISION,
    "particulatesMatter" DOUBLE PRECISION,
    "resourceUseMinerals" DOUBLE PRECISION,
    "resourceUseFossils" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvironmentalImpactResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierDataRequest" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierEmail" TEXT,
    "componentType" TEXT NOT NULL,
    "dataRequired" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "responseData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPortalToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPortalToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopuosAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "missionName" TEXT,
    "orbitRegime" TEXT NOT NULL,
    "altitudeKm" INTEGER,
    "inclinationDeg" DOUBLE PRECISION,
    "missionType" TEXT NOT NULL,
    "satelliteCategory" TEXT NOT NULL,
    "satelliteMassKg" DOUBLE PRECISION NOT NULL,
    "hasManeuverability" BOOLEAN NOT NULL DEFAULT false,
    "hasPropulsion" BOOLEAN NOT NULL DEFAULT false,
    "plannedLifetimeYears" INTEGER NOT NULL DEFAULT 5,
    "isConstellation" BOOLEAN NOT NULL DEFAULT false,
    "constellationSize" INTEGER,
    "launchDate" TIMESTAMP(3),
    "countryOfRegistry" TEXT,
    "deorbitStrategy" TEXT,
    "deorbitTimelineYears" INTEGER,
    "passivationPlan" BOOLEAN NOT NULL DEFAULT false,
    "caServiceProvider" TEXT,
    "caServiceActive" BOOLEAN NOT NULL DEFAULT false,
    "complianceScore" INTEGER,
    "mandatoryScore" INTEGER,
    "riskLevel" TEXT,
    "criticalGaps" INTEGER,
    "majorGaps" INTEGER,
    "euSpaceActOverlapCount" INTEGER,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reportGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopuosAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopuosGuidelineStatus" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "guidelineId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_assessed',
    "notes" TEXT,
    "evidenceNotes" TEXT,
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopuosGuidelineStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UkSpaceAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "operatorType" TEXT NOT NULL,
    "activityTypes" TEXT NOT NULL,
    "launchFromUk" BOOLEAN NOT NULL DEFAULT false,
    "launchToOrbit" BOOLEAN NOT NULL DEFAULT false,
    "isSuborbital" BOOLEAN NOT NULL DEFAULT false,
    "hasUkNexus" BOOLEAN NOT NULL DEFAULT true,
    "involvesPeople" BOOLEAN NOT NULL DEFAULT false,
    "isCommercial" BOOLEAN NOT NULL DEFAULT true,
    "spacecraftName" TEXT,
    "spacecraftMassKg" DOUBLE PRECISION,
    "plannedLaunchSite" TEXT,
    "targetOrbit" TEXT,
    "missionDurationYears" INTEGER,
    "requiredLicenses" TEXT,
    "licenseApplications" TEXT,
    "safetyCaseStatus" TEXT,
    "safetyCaseRef" TEXT,
    "insuranceProvider" TEXT,
    "insuranceCoverage" DOUBLE PRECISION,
    "insuranceConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "ukRegistryRef" TEXT,
    "registrationStatus" TEXT,
    "complianceScore" INTEGER,
    "mandatoryScore" INTEGER,
    "riskLevel" TEXT,
    "criticalGaps" INTEGER,
    "majorGaps" INTEGER,
    "euSpaceActOverlapCount" INTEGER,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reportGeneratedAt" TIMESTAMP(3),
    "caaDocChecklistJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UkSpaceAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UkRequirementStatus" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_assessed',
    "notes" TEXT,
    "evidenceNotes" TEXT,
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UkRequirementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsRegulatoryAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "operatorTypes" TEXT NOT NULL,
    "activityTypes" TEXT NOT NULL,
    "agencies" TEXT NOT NULL,
    "isUsEntity" BOOLEAN NOT NULL DEFAULT true,
    "usNexus" TEXT NOT NULL DEFAULT 'us_licensed',
    "orbitRegime" TEXT,
    "altitudeKm" INTEGER,
    "frequencyBands" TEXT,
    "satelliteCount" INTEGER,
    "hasManeuverability" BOOLEAN NOT NULL DEFAULT false,
    "hasPropulsion" BOOLEAN NOT NULL DEFAULT false,
    "missionDurationYears" INTEGER,
    "isConstellation" BOOLEAN NOT NULL DEFAULT false,
    "isSmallSatellite" BOOLEAN NOT NULL DEFAULT false,
    "isNGSO" BOOLEAN NOT NULL DEFAULT true,
    "providesRemoteSensing" BOOLEAN NOT NULL DEFAULT false,
    "remoteSensingResolutionM" DOUBLE PRECISION,
    "noaaTierClassification" TEXT,
    "launchVehicle" TEXT,
    "launchSite" TEXT,
    "launchDate" TIMESTAMP(3),
    "fccSpaceStationLicense" TEXT,
    "fccSpaceStationLicenseNo" TEXT,
    "fccSpectrumLicense" TEXT,
    "fccSpectrumLicenseNo" TEXT,
    "fccDebrisPlanStatus" TEXT,
    "faaLaunchLicense" TEXT,
    "faaLaunchLicenseNo" TEXT,
    "faaReentryLicense" TEXT,
    "faaSiteOperatorLicense" TEXT,
    "faaFinancialResponsibility" TEXT,
    "noaaRemoteSensingLicense" TEXT,
    "noaaLicenseNo" TEXT,
    "insuranceProvider" TEXT,
    "insuranceCoverageUsd" DOUBLE PRECISION,
    "insuranceConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "mplDetermination" DOUBLE PRECISION,
    "plannedDisposalYears" INTEGER,
    "deorbitStrategy" TEXT,
    "deorbitCapabilityConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "fccComplianceScore" INTEGER,
    "faaComplianceScore" INTEGER,
    "noaaComplianceScore" INTEGER,
    "overallComplianceScore" INTEGER,
    "mandatoryScore" INTEGER,
    "riskLevel" TEXT,
    "criticalGaps" INTEGER,
    "majorGaps" INTEGER,
    "euSpaceActOverlapCount" INTEGER,
    "copuosOverlapCount" INTEGER,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reportGeneratedAt" TIMESTAMP(3),
    "documentationChecklistJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsRegulatoryAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsRequirementStatus" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_assessed',
    "notes" TEXT,
    "evidenceNotes" TEXT,
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsRequirementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportControlAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "companyTypes" TEXT NOT NULL,
    "hasITARItems" BOOLEAN NOT NULL DEFAULT false,
    "hasEARItems" BOOLEAN NOT NULL DEFAULT false,
    "hasForeignNationals" BOOLEAN NOT NULL DEFAULT false,
    "foreignNationalCountries" TEXT,
    "exportsToCountries" TEXT,
    "hasTechnologyTransfer" BOOLEAN NOT NULL DEFAULT false,
    "hasDefenseContracts" BOOLEAN NOT NULL DEFAULT false,
    "hasManufacturingAbroad" BOOLEAN NOT NULL DEFAULT false,
    "hasJointVentures" BOOLEAN NOT NULL DEFAULT false,
    "annualExportValue" DOUBLE PRECISION,
    "registeredWithDDTC" BOOLEAN NOT NULL DEFAULT false,
    "ddtcRegistrationNo" TEXT,
    "ddtcRegistrationExpiry" TIMESTAMP(3),
    "hasTCP" BOOLEAN NOT NULL DEFAULT false,
    "tcpLastReviewDate" TIMESTAMP(3),
    "hasECL" BOOLEAN NOT NULL DEFAULT false,
    "hasAutomatedScreening" BOOLEAN NOT NULL DEFAULT false,
    "screeningVendor" TEXT,
    "empoweredOfficialName" TEXT,
    "empoweredOfficialEmail" TEXT,
    "empoweredOfficialTitle" TEXT,
    "jurisdictionDetermination" TEXT,
    "jurisdictionDeterminationDate" TIMESTAMP(3),
    "hasCJRequest" BOOLEAN NOT NULL DEFAULT false,
    "cjRequestDate" TIMESTAMP(3),
    "cjDeterminationDate" TIMESTAMP(3),
    "cjDetermination" TEXT,
    "activeITARLicenses" INTEGER,
    "pendingITARLicenses" INTEGER,
    "activeTAAs" INTEGER,
    "activeMLAs" INTEGER,
    "activeEARLicenses" INTEGER,
    "pendingEARLicenses" INTEGER,
    "usesLicenseExceptions" BOOLEAN NOT NULL DEFAULT false,
    "licenseExceptionsUsed" TEXT,
    "lastTrainingDate" TIMESTAMP(3),
    "nextTrainingDue" TIMESTAMP(3),
    "trainingCompletionRate" DOUBLE PRECISION,
    "lastAuditDate" TIMESTAMP(3),
    "nextAuditDue" TIMESTAMP(3),
    "lastAuditFindings" TEXT,
    "hasVoluntaryDisclosures" BOOLEAN NOT NULL DEFAULT false,
    "voluntaryDisclosureCount" INTEGER,
    "lastVoluntaryDisclosureDate" TIMESTAMP(3),
    "itarComplianceScore" INTEGER,
    "earComplianceScore" INTEGER,
    "overallComplianceScore" INTEGER,
    "mandatoryScore" INTEGER,
    "criticalScore" INTEGER,
    "riskLevel" TEXT,
    "criticalGaps" INTEGER,
    "highGaps" INTEGER,
    "maxCivilPenalty" DOUBLE PRECISION,
    "maxCriminalPenalty" DOUBLE PRECISION,
    "maxImprisonment" INTEGER,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reportGeneratedAt" TIMESTAMP(3),
    "documentationChecklistJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportControlAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportControlRequirementStatus" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_assessed',
    "notes" TEXT,
    "evidenceNotes" TEXT,
    "targetDate" TIMESTAMP(3),
    "responsibleParty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportControlRequirementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpectrumAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "networkName" TEXT,
    "operatorName" TEXT,
    "orbitType" TEXT NOT NULL,
    "altitudeKm" INTEGER,
    "inclinationDeg" DOUBLE PRECISION,
    "satelliteCount" INTEGER NOT NULL DEFAULT 1,
    "isConstellation" BOOLEAN NOT NULL DEFAULT false,
    "administrationCode" TEXT,
    "serviceTypes" TEXT NOT NULL,
    "frequencyBands" TEXT NOT NULL,
    "frequencyDetails" TEXT,
    "requiresEPFD" BOOLEAN NOT NULL DEFAULT false,
    "epfdCompliant" BOOLEAN,
    "epfdStudyCompleted" BOOLEAN NOT NULL DEFAULT false,
    "epfdStudyDate" TIMESTAMP(3),
    "apiStatus" TEXT NOT NULL DEFAULT 'not_started',
    "apiFilingDate" TIMESTAMP(3),
    "apiPublicationDate" TIMESTAMP(3),
    "apiExpiryDate" TIMESTAMP(3),
    "apiReference" TEXT,
    "crCStatus" TEXT NOT NULL DEFAULT 'not_started',
    "crCFilingDate" TIMESTAMP(3),
    "crCPublicationDate" TIMESTAMP(3),
    "crCReference" TEXT,
    "notificationStatus" TEXT NOT NULL DEFAULT 'not_started',
    "notificationFilingDate" TIMESTAMP(3),
    "notificationExaminationDate" TIMESTAMP(3),
    "notificationReference" TEXT,
    "recordingStatus" TEXT NOT NULL DEFAULT 'not_started',
    "recordingDate" TIMESTAMP(3),
    "recordingReference" TEXT,
    "mfrnReference" TEXT,
    "biuDeadline" TIMESTAMP(3),
    "biuAchieved" BOOLEAN NOT NULL DEFAULT false,
    "biuDate" TIMESTAMP(3),
    "biuEvidenceDocument" TEXT,
    "milestone10Percent" TIMESTAMP(3),
    "milestone50Percent" TIMESTAMP(3),
    "milestone100Percent" TIMESTAMP(3),
    "milestone10Achieved" BOOLEAN NOT NULL DEFAULT false,
    "milestone50Achieved" BOOLEAN NOT NULL DEFAULT false,
    "milestone100Achieved" BOOLEAN NOT NULL DEFAULT false,
    "coordinationStatus" TEXT,
    "hasCoordinationAgreements" BOOLEAN NOT NULL DEFAULT false,
    "coordinationAgreementsJson" TEXT,
    "jurisdictionLicenses" TEXT,
    "primaryJurisdiction" TEXT,
    "additionalJurisdictions" TEXT,
    "wrcDecisionsApplicable" TEXT,
    "wrcCompliant" BOOLEAN,
    "interferenceAnalysisComplete" BOOLEAN NOT NULL DEFAULT false,
    "interferenceAnalysisDate" TIMESTAMP(3),
    "identifiedInterferenceRisks" TEXT,
    "mitigationMeasures" TEXT,
    "ituComplianceScore" INTEGER,
    "nationalComplianceScore" INTEGER,
    "overallComplianceScore" INTEGER,
    "mandatoryScore" INTEGER,
    "criticalScore" INTEGER,
    "riskLevel" TEXT,
    "criticalGaps" INTEGER,
    "highGaps" INTEGER,
    "totalFilingDurationMonths" INTEGER,
    "nextMilestoneDate" TIMESTAMP(3),
    "nextMilestoneDescription" TEXT,
    "euSpaceActOverlapCount" INTEGER,
    "usRegulatoryOverlapCount" INTEGER,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reportGeneratedAt" TIMESTAMP(3),
    "documentationChecklistJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpectrumAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpectrumRequirementStatus" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_assessed',
    "notes" TEXT,
    "evidenceNotes" TEXT,
    "targetDate" TIMESTAMP(3),
    "responsibleParty" TEXT,
    "filingReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpectrumRequirementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisionConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryCountry" TEXT NOT NULL,
    "additionalCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "designatedContactName" TEXT,
    "designatedContactEmail" TEXT,
    "designatedContactPhone" TEXT,
    "designatedContactRole" TEXT,
    "communicationLanguage" TEXT NOT NULL DEFAULT 'en',
    "notificationMethod" TEXT NOT NULL DEFAULT 'email',
    "enableAutoReminders" BOOLEAN NOT NULL DEFAULT true,
    "reminderDaysAdvance" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "supervisionId" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "detectedBy" TEXT NOT NULL,
    "detectionMethod" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rootCause" TEXT,
    "impactAssessment" TEXT,
    "immediateActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "containmentMeasures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolutionSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lessonsLearned" TEXT,
    "requiresNCANotification" BOOLEAN NOT NULL DEFAULT true,
    "reportedToNCA" BOOLEAN NOT NULL DEFAULT false,
    "ncaReportDate" TIMESTAMP(3),
    "ncaReferenceNumber" TEXT,
    "reportedToEUSPA" BOOLEAN NOT NULL DEFAULT false,
    "euspaReportDate" TIMESTAMP(3),
    "containedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAsset" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "cosparId" TEXT,
    "noradId" TEXT,
    "assetName" TEXT NOT NULL,

    CONSTRAINT "IncidentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAttachment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisionReport" (
    "id" TEXT NOT NULL,
    "supervisionId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "reportPeriod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dueDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "title" TEXT,
    "content" TEXT,
    "ncaReferenceNumber" TEXT,
    "fileUrl" TEXT,
    "metadata" JSONB,
    "generatedAt" TIMESTAMP(3),
    "generatedBy" TEXT,
    "incidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisionCalendarEvent" (
    "id" TEXT NOT NULL,
    "supervisionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "reminderDays" INTEGER[] DEFAULT ARRAY[14, 7, 1]::INTEGER[],
    "assignee" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "linkedReportId" TEXT,
    "linkedAssetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisionCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "category" "DeadlineCategory" NOT NULL,
    "priority" "Priority" NOT NULL,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'UPCOMING',
    "moduleSource" "ModuleType",
    "relatedEntityId" TEXT,
    "reminderDays" INTEGER[] DEFAULT ARRAY[30, 14, 7, 3, 1]::INTEGER[],
    "remindersSent" TIMESTAMP(3)[],
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "parentId" TEXT,
    "assignedTo" TEXT,
    "assignedTeam" TEXT,
    "regulatoryRef" TEXT,
    "penaltyInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "completionNotes" TEXT,
    "originalDueDate" TIMESTAMP(3),
    "extensionReason" TEXT,
    "extensionApprovedBy" TEXT,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionPhase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "missionName" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PhaseStatus" NOT NULL DEFAULT 'PLANNED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "dependsOn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "isRegulatory" BOOLEAN NOT NULL DEFAULT false,
    "regulatoryRef" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "subcategory" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "storagePath" TEXT NOT NULL,
    "storageProvider" TEXT,
    "checksum" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "expiryAlertDays" INTEGER[] DEFAULT ARRAY[90, 30, 14, 7]::INTEGER[],
    "moduleType" "ModuleType",
    "relatedEntityId" TEXT,
    "regulatoryRef" TEXT,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'INTERNAL',
    "allowedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AccessAction" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentComment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentShare" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sharedWith" TEXT,
    "shareToken" TEXT NOT NULL,
    "accessType" "ShareAccessType" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxDownloads" INTEGER,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "password" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessed" TIMESTAMP(3),

    CONSTRAINT "DocumentShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "templatePath" TEXT NOT NULL,
    "templateContent" TEXT,
    "placeholders" TEXT NOT NULL,
    "regulatoryRef" TEXT,
    "requiredFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "errorMessage" TEXT,
    "metadata" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportType" "ScheduledReportType" NOT NULL,
    "schedule" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "recipients" TEXT[],
    "sendToSelf" BOOLEAN NOT NULL DEFAULT true,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "includeCharts" BOOLEAN NOT NULL DEFAULT true,
    "filters" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportArchive" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportType" "ScheduledReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "generationTimeMs" INTEGER,
    "scheduledReportId" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "metadata" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NCASubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "ncaAuthority" "NCAAuthority" NOT NULL,
    "ncaAuthorityName" TEXT NOT NULL,
    "ncaPortalUrl" TEXT,
    "submissionMethod" "SubmissionMethod" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "attachments" JSONB,
    "coverLetter" TEXT,
    "status" "NCASubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "statusHistory" JSONB,
    "ncaReference" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "responseNotes" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDeadline" TIMESTAMP(3),
    "followUpNotes" TEXT,
    "originalSubmissionId" TEXT,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "packageId" TEXT,
    "estimatedResponseDate" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3),
    "priority" "SubmissionPriority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NCASubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NCACorrespondence" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "direction" "CorrespondenceDirection" NOT NULL,
    "messageType" "MessageType" NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "sentAt" TIMESTAMP(3),
    "sentBy" TEXT,
    "receivedAt" TIMESTAMP(3),
    "ncaContactName" TEXT,
    "ncaContactEmail" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "requiresResponse" BOOLEAN NOT NULL DEFAULT false,
    "responseDeadline" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NCACorrespondence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionPackage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ncaAuthority" "NCAAuthority" NOT NULL,
    "packageName" TEXT NOT NULL,
    "description" TEXT,
    "documents" JSONB NOT NULL,
    "completenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiredDocuments" JSONB NOT NULL,
    "missingDocuments" JSONB NOT NULL,
    "assembledAt" TIMESTAMP(3),
    "exportedAt" TIMESTAMP(3),
    "exportFormat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#3B82F6',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "plan" "OrganizationPlan" NOT NULL DEFAULT 'FREE',
    "planExpiresAt" TIMESTAMP(3),
    "maxUsers" INTEGER NOT NULL DEFAULT 3,
    "maxSpacecraft" INTEGER NOT NULL DEFAULT 5,
    "billingEmail" TEXT,
    "vatNumber" TEXT,
    "billingAddress" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "plan" "OrganizationPlan" NOT NULL DEFAULT 'FREE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "permissions" TEXT[],
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spacecraft" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cosparId" TEXT,
    "noradId" TEXT,
    "missionType" TEXT NOT NULL,
    "launchDate" TIMESTAMP(3),
    "endOfLifeDate" TIMESTAMP(3),
    "orbitType" TEXT NOT NULL,
    "altitudeKm" DOUBLE PRECISION,
    "inclinationDeg" DOUBLE PRECISION,
    "status" "SpacecraftStatus" NOT NULL DEFAULT 'PRE_LAUNCH',
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spacecraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceObjectRegistration" (
    "id" TEXT NOT NULL,
    "internationalDesignator" TEXT,
    "noradCatalogNumber" TEXT,
    "objectName" TEXT NOT NULL,
    "objectType" "SpaceObjectType" NOT NULL,
    "launchDate" TIMESTAMP(3),
    "launchSite" TEXT,
    "launchVehicle" TEXT,
    "launchState" TEXT,
    "orbitalRegime" "OrbitalRegime" NOT NULL,
    "perigee" DOUBLE PRECISION,
    "apogee" DOUBLE PRECISION,
    "inclination" DOUBLE PRECISION,
    "period" DOUBLE PRECISION,
    "nodeLongitude" DOUBLE PRECISION,
    "ownerOperator" TEXT NOT NULL,
    "stateOfRegistry" TEXT NOT NULL,
    "jurisdictionState" TEXT,
    "generalFunction" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3),
    "ursoReference" TEXT,
    "ncaReference" TEXT,
    "deregisteredAt" TIMESTAMP(3),
    "deregistrationReason" TEXT,
    "reentryDate" TIMESTAMP(3),
    "lastAmendmentDate" TIMESTAMP(3),
    "amendmentReason" TEXT,
    "spacecraftId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "submittedBy" TEXT,

    CONSTRAINT "SpaceObjectRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationStatusHistory" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "fromStatus" "RegistrationStatus",
    "toStatus" "RegistrationStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationAttachment" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "categories" JSONB,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "quietHoursTimezone" TEXT DEFAULT 'Europe/Berlin',
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "digestFrequency" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SSOConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "SSOProvider" NOT NULL,
    "entityId" TEXT,
    "ssoUrl" TEXT,
    "certificate" TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "issuerUrl" TEXT,
    "autoProvision" BOOLEAN NOT NULL DEFAULT true,
    "defaultRole" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "domains" TEXT[],
    "enforceSSO" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SSOConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "deviceType" TEXT,
    "browser" TEXT,
    "browserVersion" TEXT,
    "os" TEXT,
    "osVersion" TEXT,
    "ipAddress" TEXT,
    "city" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "authMethod" "AuthMethod" NOT NULL DEFAULT 'PASSWORD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "backupCodes" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAuthnCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "deviceName" TEXT,
    "deviceType" TEXT,
    "aaguid" TEXT,
    "transports" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "LoginEventType" NOT NULL DEFAULT 'LOGIN_SUCCESS',
    "deviceType" TEXT,
    "browser" TEXT,
    "browserVersion" TEXT,
    "os" TEXT,
    "osVersion" TEXT,
    "ipAddress" TEXT,
    "city" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "authMethod" "AuthMethod" NOT NULL DEFAULT 'PASSWORD',
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "suspiciousReasons" TEXT,
    "sessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "event" "SecurityAuditEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "city" TEXT,
    "country" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoneyToken" (
    "id" TEXT NOT NULL,
    "tokenType" "HoneyTokenType" NOT NULL DEFAULT 'API_KEY',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tokenValue" TEXT NOT NULL,
    "tokenHash" TEXT,
    "alertEmail" TEXT,
    "alertWebhookUrl" TEXT,
    "contextPath" TEXT,
    "contextType" TEXT,
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastTriggeredIp" TEXT,
    "lastTriggeredUa" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HoneyToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoneyTokenTrigger" (
    "id" TEXT NOT NULL,
    "honeyTokenId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestPath" TEXT,
    "requestMethod" TEXT,
    "requestHeaders" JSONB,
    "city" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "severity" "RiskLevel" NOT NULL DEFAULT 'HIGH',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HoneyTokenTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "signingSecret" TEXT,
    "requireSigning" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "previousKeyHash" TEXT,
    "rotatedAt" TIMESTAMP(3),
    "graceEndsAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "keyType" TEXT NOT NULL DEFAULT 'standard',

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL DEFAULT 'quick_check',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "allowedDomains" TEXT[],
    "customCta" TEXT,
    "ctaUrl" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "ctaClicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRequest" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "headers" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "responseBody" TEXT,
    "responseTimeMs" INTEGER,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" TEXT[],
    "parentId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceEvidence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "regulationType" "RegulationType" NOT NULL,
    "requirementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "evidenceType" "EvidenceType" NOT NULL,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'DRAFT',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceEvidenceDocument" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceEvidenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AstraConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'general',
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AstraConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AstraMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "toolResults" JSONB,
    "sources" JSONB,
    "confidence" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AstraMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventCategory" TEXT NOT NULL DEFAULT 'general',
    "eventData" JSONB,
    "path" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipCountry" TEXT,
    "durationMs" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsDailyAggregate" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "metricType" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "dimension" TEXT,
    "dimensionValue" TEXT,
    "previousValue" DOUBLE PRECISION,
    "changePercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsDailyAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerHealthScore" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "trend" TEXT NOT NULL DEFAULT 'stable',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "factors" JSONB NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "loginFrequency" DOUBLE PRECISION,
    "activeFeatures" INTEGER,
    "sessionsLast30" INTEGER,
    "avgSessionMins" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerHealthScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "organizationId" TEXT,
    "description" TEXT,
    "date" DATE NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPeriod" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueSnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mrr" DOUBLE PRECISION NOT NULL,
    "arr" DOUBLE PRECISION NOT NULL,
    "mrrGrowth" DOUBLE PRECISION,
    "newMrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expansionMrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractionMrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churnedMrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCustomers" INTEGER NOT NULL,
    "newCustomers" INTEGER NOT NULL DEFAULT 0,
    "churnedCustomers" INTEGER NOT NULL DEFAULT 0,
    "arpu" DOUBLE PRECISION,
    "ltv" DOUBLE PRECISION,
    "cashBalance" DOUBLE PRECISION,
    "burnRate" DOUBLE PRECISION,
    "runwayMonths" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureUsageDaily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "featureId" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "moduleCategory" TEXT NOT NULL,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalActions" INTEGER NOT NULL DEFAULT 0,
    "avgDurationSecs" DOUBLE PRECISION,
    "completionRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureUsageDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "medium" TEXT,
    "campaign" TEXT,
    "content" TEXT,
    "term" TEXT,
    "landingPage" TEXT,
    "referrerUrl" TEXT,
    "eventType" TEXT NOT NULL,
    "country" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcquisitionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemHealthMetric" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metricName" TEXT NOT NULL,
    "service" TEXT NOT NULL DEFAULT 'main',
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "endpoint" TEXT,
    "statusCode" INTEGER,

    CONSTRAINT "SystemHealthMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiEndpointMetrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "avgLatency" DOUBLE PRECISION,
    "p50Latency" DOUBLE PRECISION,
    "p95Latency" DOUBLE PRECISION,
    "p99Latency" DOUBLE PRECISION,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiEndpointMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" "DocumentGenerationType" NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "assessmentId" TEXT,
    "assessmentType" TEXT,
    "status" "DocumentGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "content" JSONB,
    "rawContent" TEXT,
    "modelUsed" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "generationTimeMs" INTEGER,
    "promptVersion" TEXT,
    "editedContent" JSONB,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "pdfGenerated" BOOLEAN NOT NULL DEFAULT false,
    "pdfGeneratedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreachReport" (
    "id" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "organizationId" TEXT,
    "severity" "BreachSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "BreachStatus" NOT NULL DEFAULT 'DETECTED',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedDataTypes" TEXT NOT NULL,
    "affectedDataSubjects" INTEGER NOT NULL DEFAULT 0,
    "discoveredAt" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "containedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "authorityNotifiedAt" TIMESTAMP(3),
    "subjectsNotifiedAt" TIMESTAMP(3),
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreachReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_unlockToken_key" ON "User"("unlockToken");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "ArticleStatus_userId_idx" ON "ArticleStatus"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleStatus_userId_articleId_key" ON "ArticleStatus"("userId", "articleId");

-- CreateIndex
CREATE INDEX "ChecklistStatus_userId_idx" ON "ChecklistStatus"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistStatus_userId_checklistId_key" ON "ChecklistStatus"("userId", "checklistId");

-- CreateIndex
CREATE INDEX "AuthorizationWorkflow_userId_idx" ON "AuthorizationWorkflow"("userId");

-- CreateIndex
CREATE INDEX "AuthorizationWorkflow_status_idx" ON "AuthorizationWorkflow"("status");

-- CreateIndex
CREATE INDEX "AuthorizationWorkflow_userId_status_targetSubmission_idx" ON "AuthorizationWorkflow"("userId", "status", "targetSubmission");

-- CreateIndex
CREATE INDEX "AuthorizationDocument_workflowId_idx" ON "AuthorizationDocument"("workflowId");

-- CreateIndex
CREATE INDEX "AuthorizationDocument_status_idx" ON "AuthorizationDocument"("status");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entryHash_idx" ON "AuditLog"("entryHash");

-- CreateIndex
CREATE INDEX "DebrisAssessment_userId_idx" ON "DebrisAssessment"("userId");

-- CreateIndex
CREATE INDEX "DebrisRequirementStatus_assessmentId_idx" ON "DebrisRequirementStatus"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "DebrisRequirementStatus_assessmentId_requirementId_key" ON "DebrisRequirementStatus"("assessmentId", "requirementId");

-- CreateIndex
CREATE INDEX "CybersecurityAssessment_userId_idx" ON "CybersecurityAssessment"("userId");

-- CreateIndex
CREATE INDEX "CybersecurityRequirementStatus_assessmentId_idx" ON "CybersecurityRequirementStatus"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CybersecurityRequirementStatus_assessmentId_requirementId_key" ON "CybersecurityRequirementStatus"("assessmentId", "requirementId");

-- CreateIndex
CREATE INDEX "NIS2Assessment_userId_idx" ON "NIS2Assessment"("userId");

-- CreateIndex
CREATE INDEX "NIS2Assessment_entityClassification_idx" ON "NIS2Assessment"("entityClassification");

-- CreateIndex
CREATE INDEX "NIS2RequirementStatus_assessmentId_idx" ON "NIS2RequirementStatus"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "NIS2RequirementStatus_assessmentId_requirementId_key" ON "NIS2RequirementStatus"("assessmentId", "requirementId");

-- CreateIndex
CREATE INDEX "InsuranceAssessment_userId_idx" ON "InsuranceAssessment"("userId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_assessmentId_idx" ON "InsurancePolicy"("assessmentId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_status_idx" ON "InsurancePolicy"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InsurancePolicy_assessmentId_insuranceType_key" ON "InsurancePolicy"("assessmentId", "insuranceType");

-- CreateIndex
CREATE INDEX "EnvironmentalAssessment_userId_idx" ON "EnvironmentalAssessment"("userId");

-- CreateIndex
CREATE INDEX "EnvironmentalAssessment_status_idx" ON "EnvironmentalAssessment"("status");

-- CreateIndex
CREATE INDEX "EnvironmentalImpactResult_assessmentId_idx" ON "EnvironmentalImpactResult"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EnvironmentalImpactResult_assessmentId_phase_key" ON "EnvironmentalImpactResult"("assessmentId", "phase");

-- CreateIndex
CREATE INDEX "SupplierDataRequest_assessmentId_idx" ON "SupplierDataRequest"("assessmentId");

-- CreateIndex
CREATE INDEX "SupplierDataRequest_status_idx" ON "SupplierDataRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPortalToken_token_key" ON "SupplierPortalToken"("token");

-- CreateIndex
CREATE INDEX "SupplierPortalToken_token_idx" ON "SupplierPortalToken"("token");

-- CreateIndex
CREATE INDEX "SupplierPortalToken_requestId_idx" ON "SupplierPortalToken"("requestId");

-- CreateIndex
CREATE INDEX "SupplierPortalToken_expiresAt_idx" ON "SupplierPortalToken"("expiresAt");

-- CreateIndex
CREATE INDEX "CopuosAssessment_userId_idx" ON "CopuosAssessment"("userId");

-- CreateIndex
CREATE INDEX "CopuosAssessment_orbitRegime_idx" ON "CopuosAssessment"("orbitRegime");

-- CreateIndex
CREATE INDEX "CopuosAssessment_status_idx" ON "CopuosAssessment"("status");

-- CreateIndex
CREATE INDEX "CopuosGuidelineStatus_assessmentId_idx" ON "CopuosGuidelineStatus"("assessmentId");

-- CreateIndex
CREATE INDEX "CopuosGuidelineStatus_status_idx" ON "CopuosGuidelineStatus"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CopuosGuidelineStatus_assessmentId_guidelineId_key" ON "CopuosGuidelineStatus"("assessmentId", "guidelineId");

-- CreateIndex
CREATE INDEX "UkSpaceAssessment_userId_idx" ON "UkSpaceAssessment"("userId");

-- CreateIndex
CREATE INDEX "UkSpaceAssessment_operatorType_idx" ON "UkSpaceAssessment"("operatorType");

-- CreateIndex
CREATE INDEX "UkSpaceAssessment_status_idx" ON "UkSpaceAssessment"("status");

-- CreateIndex
CREATE INDEX "UkRequirementStatus_assessmentId_idx" ON "UkRequirementStatus"("assessmentId");

-- CreateIndex
CREATE INDEX "UkRequirementStatus_status_idx" ON "UkRequirementStatus"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UkRequirementStatus_assessmentId_requirementId_key" ON "UkRequirementStatus"("assessmentId", "requirementId");

-- CreateIndex
CREATE INDEX "UsRegulatoryAssessment_userId_idx" ON "UsRegulatoryAssessment"("userId");

-- CreateIndex
CREATE INDEX "UsRegulatoryAssessment_status_idx" ON "UsRegulatoryAssessment"("status");

-- CreateIndex
CREATE INDEX "UsRegulatoryAssessment_orbitRegime_idx" ON "UsRegulatoryAssessment"("orbitRegime");

-- CreateIndex
CREATE INDEX "UsRequirementStatus_assessmentId_idx" ON "UsRequirementStatus"("assessmentId");

-- CreateIndex
CREATE INDEX "UsRequirementStatus_status_idx" ON "UsRequirementStatus"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UsRequirementStatus_assessmentId_requirementId_key" ON "UsRequirementStatus"("assessmentId", "requirementId");

-- CreateIndex
CREATE INDEX "ExportControlAssessment_userId_idx" ON "ExportControlAssessment"("userId");

-- CreateIndex
CREATE INDEX "ExportControlAssessment_status_idx" ON "ExportControlAssessment"("status");

-- CreateIndex
CREATE INDEX "ExportControlAssessment_riskLevel_idx" ON "ExportControlAssessment"("riskLevel");

-- CreateIndex
CREATE INDEX "ExportControlAssessment_hasITARItems_idx" ON "ExportControlAssessment"("hasITARItems");

-- CreateIndex
CREATE INDEX "ExportControlAssessment_hasEARItems_idx" ON "ExportControlAssessment"("hasEARItems");

-- CreateIndex
CREATE INDEX "ExportControlRequirementStatus_assessmentId_idx" ON "ExportControlRequirementStatus"("assessmentId");

-- CreateIndex
CREATE INDEX "ExportControlRequirementStatus_status_idx" ON "ExportControlRequirementStatus"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ExportControlRequirementStatus_assessmentId_requirementId_key" ON "ExportControlRequirementStatus"("assessmentId", "requirementId");

-- CreateIndex
CREATE INDEX "SpectrumAssessment_userId_idx" ON "SpectrumAssessment"("userId");

-- CreateIndex
CREATE INDEX "SpectrumAssessment_status_idx" ON "SpectrumAssessment"("status");

-- CreateIndex
CREATE INDEX "SpectrumAssessment_orbitType_idx" ON "SpectrumAssessment"("orbitType");

-- CreateIndex
CREATE INDEX "SpectrumAssessment_administrationCode_idx" ON "SpectrumAssessment"("administrationCode");

-- CreateIndex
CREATE INDEX "SpectrumRequirementStatus_assessmentId_idx" ON "SpectrumRequirementStatus"("assessmentId");

-- CreateIndex
CREATE INDEX "SpectrumRequirementStatus_status_idx" ON "SpectrumRequirementStatus"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SpectrumRequirementStatus_assessmentId_requirementId_key" ON "SpectrumRequirementStatus"("assessmentId", "requirementId");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_idx" ON "LoginAttempt"("email");

-- CreateIndex
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_type_idx" ON "SecurityEvent"("type");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");

-- CreateIndex
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_resolved_idx" ON "SecurityEvent"("resolved");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisionConfig_userId_key" ON "SupervisionConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_incidentNumber_key" ON "Incident"("incidentNumber");

-- CreateIndex
CREATE INDEX "Incident_supervisionId_idx" ON "Incident"("supervisionId");

-- CreateIndex
CREATE INDEX "Incident_category_idx" ON "Incident"("category");

-- CreateIndex
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_detectedAt_idx" ON "Incident"("detectedAt");

-- CreateIndex
CREATE INDEX "IncidentAsset_incidentId_idx" ON "IncidentAsset"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentAttachment_incidentId_idx" ON "IncidentAttachment"("incidentId");

-- CreateIndex
CREATE INDEX "SupervisionReport_supervisionId_idx" ON "SupervisionReport"("supervisionId");

-- CreateIndex
CREATE INDEX "SupervisionReport_reportType_idx" ON "SupervisionReport"("reportType");

-- CreateIndex
CREATE INDEX "SupervisionReport_dueDate_idx" ON "SupervisionReport"("dueDate");

-- CreateIndex
CREATE INDEX "SupervisionReport_status_idx" ON "SupervisionReport"("status");

-- CreateIndex
CREATE INDEX "SupervisionReport_incidentId_idx" ON "SupervisionReport"("incidentId");

-- CreateIndex
CREATE INDEX "SupervisionReport_generatedBy_idx" ON "SupervisionReport"("generatedBy");

-- CreateIndex
CREATE INDEX "SupervisionCalendarEvent_supervisionId_idx" ON "SupervisionCalendarEvent"("supervisionId");

-- CreateIndex
CREATE INDEX "SupervisionCalendarEvent_dueDate_idx" ON "SupervisionCalendarEvent"("dueDate");

-- CreateIndex
CREATE INDEX "SupervisionCalendarEvent_status_idx" ON "SupervisionCalendarEvent"("status");

-- CreateIndex
CREATE INDEX "SupervisionCalendarEvent_eventType_idx" ON "SupervisionCalendarEvent"("eventType");

-- CreateIndex
CREATE INDEX "Deadline_userId_dueDate_idx" ON "Deadline"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Deadline_status_dueDate_idx" ON "Deadline"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Deadline_category_idx" ON "Deadline"("category");

-- CreateIndex
CREATE INDEX "Deadline_moduleSource_idx" ON "Deadline"("moduleSource");

-- CreateIndex
CREATE INDEX "Deadline_parentId_idx" ON "Deadline"("parentId");

-- CreateIndex
CREATE INDEX "Deadline_userId_status_dueDate_idx" ON "Deadline"("userId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "MissionPhase_userId_missionId_idx" ON "MissionPhase"("userId", "missionId");

-- CreateIndex
CREATE INDEX "MissionPhase_status_idx" ON "MissionPhase"("status");

-- CreateIndex
CREATE INDEX "Milestone_phaseId_targetDate_idx" ON "Milestone"("phaseId", "targetDate");

-- CreateIndex
CREATE INDEX "Milestone_status_idx" ON "Milestone"("status");

-- CreateIndex
CREATE INDEX "Document_userId_category_idx" ON "Document"("userId", "category");

-- CreateIndex
CREATE INDEX "Document_expiryDate_idx" ON "Document"("expiryDate");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_moduleType_idx" ON "Document"("moduleType");

-- CreateIndex
CREATE INDEX "Document_userId_status_expiryDate_idx" ON "Document"("userId", "status", "expiryDate");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_documentId_createdAt_idx" ON "DocumentAccessLog"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_userId_createdAt_idx" ON "DocumentAccessLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentComment_documentId_createdAt_idx" ON "DocumentComment"("documentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentShare_shareToken_key" ON "DocumentShare"("shareToken");

-- CreateIndex
CREATE INDEX "DocumentShare_shareToken_idx" ON "DocumentShare"("shareToken");

-- CreateIndex
CREATE INDEX "DocumentShare_documentId_idx" ON "DocumentShare"("documentId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_userId_category_idx" ON "DocumentTemplate"("userId", "category");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_sentAt_idx" ON "NotificationLog"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "NotificationLog_entityType_entityId_idx" ON "NotificationLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_notificationType_idx" ON "NotificationLog"("notificationType");

-- CreateIndex
CREATE INDEX "ScheduledReport_userId_idx" ON "ScheduledReport"("userId");

-- CreateIndex
CREATE INDEX "ScheduledReport_nextRunAt_isActive_idx" ON "ScheduledReport"("nextRunAt", "isActive");

-- CreateIndex
CREATE INDEX "ScheduledReport_reportType_idx" ON "ScheduledReport"("reportType");

-- CreateIndex
CREATE INDEX "ReportArchive_userId_idx" ON "ReportArchive"("userId");

-- CreateIndex
CREATE INDEX "ReportArchive_reportType_idx" ON "ReportArchive"("reportType");

-- CreateIndex
CREATE INDEX "ReportArchive_generatedAt_idx" ON "ReportArchive"("generatedAt");

-- CreateIndex
CREATE INDEX "ReportArchive_scheduledReportId_idx" ON "ReportArchive"("scheduledReportId");

-- CreateIndex
CREATE INDEX "ReportArchive_expiresAt_idx" ON "ReportArchive"("expiresAt");

-- CreateIndex
CREATE INDEX "NCASubmission_userId_idx" ON "NCASubmission"("userId");

-- CreateIndex
CREATE INDEX "NCASubmission_reportId_idx" ON "NCASubmission"("reportId");

-- CreateIndex
CREATE INDEX "NCASubmission_ncaAuthority_idx" ON "NCASubmission"("ncaAuthority");

-- CreateIndex
CREATE INDEX "NCASubmission_status_idx" ON "NCASubmission"("status");

-- CreateIndex
CREATE INDEX "NCASubmission_submittedAt_idx" ON "NCASubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "NCASubmission_originalSubmissionId_idx" ON "NCASubmission"("originalSubmissionId");

-- CreateIndex
CREATE INDEX "NCASubmission_packageId_idx" ON "NCASubmission"("packageId");

-- CreateIndex
CREATE INDEX "NCASubmission_priority_idx" ON "NCASubmission"("priority");

-- CreateIndex
CREATE INDEX "NCASubmission_slaDeadline_idx" ON "NCASubmission"("slaDeadline");

-- CreateIndex
CREATE INDEX "NCACorrespondence_submissionId_idx" ON "NCACorrespondence"("submissionId");

-- CreateIndex
CREATE INDEX "NCACorrespondence_direction_idx" ON "NCACorrespondence"("direction");

-- CreateIndex
CREATE INDEX "NCACorrespondence_isRead_idx" ON "NCACorrespondence"("isRead");

-- CreateIndex
CREATE INDEX "NCACorrespondence_requiresResponse_idx" ON "NCACorrespondence"("requiresResponse");

-- CreateIndex
CREATE INDEX "NCACorrespondence_responseDeadline_idx" ON "NCACorrespondence"("responseDeadline");

-- CreateIndex
CREATE INDEX "SubmissionPackage_userId_idx" ON "SubmissionPackage"("userId");

-- CreateIndex
CREATE INDEX "SubmissionPackage_organizationId_idx" ON "SubmissionPackage"("organizationId");

-- CreateIndex
CREATE INDEX "SubmissionPackage_ncaAuthority_idx" ON "SubmissionPackage"("ncaAuthority");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_token_idx" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_email_idx" ON "OrganizationInvitation"("email");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_idx" ON "OrganizationInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "Spacecraft_organizationId_idx" ON "Spacecraft"("organizationId");

-- CreateIndex
CREATE INDEX "Spacecraft_cosparId_idx" ON "Spacecraft"("cosparId");

-- CreateIndex
CREATE INDEX "Spacecraft_noradId_idx" ON "Spacecraft"("noradId");

-- CreateIndex
CREATE INDEX "Spacecraft_status_idx" ON "Spacecraft"("status");

-- CreateIndex
CREATE INDEX "SpaceObjectRegistration_spacecraftId_idx" ON "SpaceObjectRegistration"("spacecraftId");

-- CreateIndex
CREATE INDEX "SpaceObjectRegistration_organizationId_idx" ON "SpaceObjectRegistration"("organizationId");

-- CreateIndex
CREATE INDEX "SpaceObjectRegistration_internationalDesignator_idx" ON "SpaceObjectRegistration"("internationalDesignator");

-- CreateIndex
CREATE INDEX "SpaceObjectRegistration_status_idx" ON "SpaceObjectRegistration"("status");

-- CreateIndex
CREATE INDEX "SpaceObjectRegistration_stateOfRegistry_idx" ON "SpaceObjectRegistration"("stateOfRegistry");

-- CreateIndex
CREATE INDEX "RegistrationStatusHistory_registrationId_createdAt_idx" ON "RegistrationStatusHistory"("registrationId", "createdAt");

-- CreateIndex
CREATE INDEX "RegistrationAttachment_registrationId_idx" ON "RegistrationAttachment"("registrationId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SSOConnection_organizationId_key" ON "SSOConnection"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionToken_key" ON "UserSession"("sessionToken");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_sessionToken_idx" ON "UserSession"("sessionToken");

-- CreateIndex
CREATE INDEX "UserSession_userId_isActive_idx" ON "UserSession"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MfaConfig_userId_key" ON "MfaConfig"("userId");

-- CreateIndex
CREATE INDEX "MfaConfig_userId_idx" ON "MfaConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WebAuthnCredential_credentialId_key" ON "WebAuthnCredential"("credentialId");

-- CreateIndex
CREATE INDEX "WebAuthnCredential_userId_idx" ON "WebAuthnCredential"("userId");

-- CreateIndex
CREATE INDEX "WebAuthnCredential_credentialId_idx" ON "WebAuthnCredential"("credentialId");

-- CreateIndex
CREATE INDEX "LoginEvent_userId_createdAt_idx" ON "LoginEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginEvent_ipAddress_createdAt_idx" ON "LoginEvent"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "LoginEvent_isSuspicious_createdAt_idx" ON "LoginEvent"("isSuspicious", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_organizationId_createdAt_idx" ON "SecurityAuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_userId_createdAt_idx" ON "SecurityAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_event_createdAt_idx" ON "SecurityAuditLog"("event", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_riskLevel_createdAt_idx" ON "SecurityAuditLog"("riskLevel", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HoneyToken_tokenValue_key" ON "HoneyToken"("tokenValue");

-- CreateIndex
CREATE INDEX "HoneyToken_tokenValue_idx" ON "HoneyToken"("tokenValue");

-- CreateIndex
CREATE INDEX "HoneyToken_tokenHash_idx" ON "HoneyToken"("tokenHash");

-- CreateIndex
CREATE INDEX "HoneyToken_tokenType_isActive_idx" ON "HoneyToken"("tokenType", "isActive");

-- CreateIndex
CREATE INDEX "HoneyTokenTrigger_honeyTokenId_createdAt_idx" ON "HoneyTokenTrigger"("honeyTokenId", "createdAt");

-- CreateIndex
CREATE INDEX "HoneyTokenTrigger_ipAddress_createdAt_idx" ON "HoneyTokenTrigger"("ipAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "ApiKey_previousKeyHash_idx" ON "ApiKey"("previousKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetConfig_apiKeyId_key" ON "WidgetConfig"("apiKeyId");

-- CreateIndex
CREATE INDEX "WidgetConfig_organizationId_idx" ON "WidgetConfig"("organizationId");

-- CreateIndex
CREATE INDEX "WidgetConfig_apiKeyId_idx" ON "WidgetConfig"("apiKeyId");

-- CreateIndex
CREATE INDEX "ApiRequest_apiKeyId_createdAt_idx" ON "ApiRequest"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiRequest_createdAt_idx" ON "ApiRequest"("createdAt");

-- CreateIndex
CREATE INDEX "Webhook_organizationId_idx" ON "Webhook"("organizationId");

-- CreateIndex
CREATE INDEX "Webhook_isActive_idx" ON "Webhook"("isActive");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_createdAt_idx" ON "WebhookDelivery"("webhookId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextRetryAt_idx" ON "WebhookDelivery"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "Comment_organizationId_idx" ON "Comment"("organizationId");

-- CreateIndex
CREATE INDEX "Comment_entityType_entityId_idx" ON "Comment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Activity_organizationId_createdAt_idx" ON "Activity"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_entityType_entityId_idx" ON "Activity"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_organizationId_idx" ON "ComplianceEvidence"("organizationId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_organizationId_regulationType_idx" ON "ComplianceEvidence"("organizationId", "regulationType");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_regulationType_requirementId_idx" ON "ComplianceEvidence"("regulationType", "requirementId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_status_idx" ON "ComplianceEvidence"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceEvidence_organizationId_regulationType_requiremen_key" ON "ComplianceEvidence"("organizationId", "regulationType", "requirementId", "title");

-- CreateIndex
CREATE INDEX "ComplianceEvidenceDocument_evidenceId_idx" ON "ComplianceEvidenceDocument"("evidenceId");

-- CreateIndex
CREATE INDEX "ComplianceEvidenceDocument_documentId_idx" ON "ComplianceEvidenceDocument"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceEvidenceDocument_evidenceId_documentId_key" ON "ComplianceEvidenceDocument"("evidenceId", "documentId");

-- CreateIndex
CREATE INDEX "AstraConversation_userId_idx" ON "AstraConversation"("userId");

-- CreateIndex
CREATE INDEX "AstraConversation_organizationId_idx" ON "AstraConversation"("organizationId");

-- CreateIndex
CREATE INDEX "AstraConversation_createdAt_idx" ON "AstraConversation"("createdAt");

-- CreateIndex
CREATE INDEX "AstraConversation_userId_organizationId_idx" ON "AstraConversation"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "AstraMessage_conversationId_idx" ON "AstraMessage"("conversationId");

-- CreateIndex
CREATE INDEX "AstraMessage_createdAt_idx" ON "AstraMessage"("createdAt");

-- CreateIndex
CREATE INDEX "AstraMessage_conversationId_createdAt_idx" ON "AstraMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_organizationId_idx" ON "AnalyticsEvent"("organizationId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventCategory_idx" ON "AnalyticsEvent"("eventCategory");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_timestamp_idx" ON "AnalyticsEvent"("timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_timestamp_idx" ON "AnalyticsEvent"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_timestamp_idx" ON "AnalyticsEvent"("eventType", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsDailyAggregate_date_idx" ON "AnalyticsDailyAggregate"("date");

-- CreateIndex
CREATE INDEX "AnalyticsDailyAggregate_metricType_idx" ON "AnalyticsDailyAggregate"("metricType");

-- CreateIndex
CREATE INDEX "AnalyticsDailyAggregate_date_metricType_idx" ON "AnalyticsDailyAggregate"("date", "metricType");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsDailyAggregate_date_metricType_dimension_dimension_key" ON "AnalyticsDailyAggregate"("date", "metricType", "dimension", "dimensionValue");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerHealthScore_organizationId_key" ON "CustomerHealthScore"("organizationId");

-- CreateIndex
CREATE INDEX "CustomerHealthScore_score_idx" ON "CustomerHealthScore"("score");

-- CreateIndex
CREATE INDEX "CustomerHealthScore_riskLevel_idx" ON "CustomerHealthScore"("riskLevel");

-- CreateIndex
CREATE INDEX "CustomerHealthScore_calculatedAt_idx" ON "CustomerHealthScore"("calculatedAt");

-- CreateIndex
CREATE INDEX "FinancialEntry_type_idx" ON "FinancialEntry"("type");

-- CreateIndex
CREATE INDEX "FinancialEntry_category_idx" ON "FinancialEntry"("category");

-- CreateIndex
CREATE INDEX "FinancialEntry_date_idx" ON "FinancialEntry"("date");

-- CreateIndex
CREATE INDEX "FinancialEntry_source_idx" ON "FinancialEntry"("source");

-- CreateIndex
CREATE INDEX "FinancialEntry_organizationId_idx" ON "FinancialEntry"("organizationId");

-- CreateIndex
CREATE INDEX "FinancialEntry_date_type_idx" ON "FinancialEntry"("date", "type");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueSnapshot_date_key" ON "RevenueSnapshot"("date");

-- CreateIndex
CREATE INDEX "RevenueSnapshot_date_idx" ON "RevenueSnapshot"("date");

-- CreateIndex
CREATE INDEX "FeatureUsageDaily_date_idx" ON "FeatureUsageDaily"("date");

-- CreateIndex
CREATE INDEX "FeatureUsageDaily_featureId_idx" ON "FeatureUsageDaily"("featureId");

-- CreateIndex
CREATE INDEX "FeatureUsageDaily_moduleCategory_idx" ON "FeatureUsageDaily"("moduleCategory");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureUsageDaily_date_featureId_key" ON "FeatureUsageDaily"("date", "featureId");

-- CreateIndex
CREATE INDEX "AcquisitionEvent_userId_idx" ON "AcquisitionEvent"("userId");

-- CreateIndex
CREATE INDEX "AcquisitionEvent_anonymousId_idx" ON "AcquisitionEvent"("anonymousId");

-- CreateIndex
CREATE INDEX "AcquisitionEvent_source_idx" ON "AcquisitionEvent"("source");

-- CreateIndex
CREATE INDEX "AcquisitionEvent_eventType_idx" ON "AcquisitionEvent"("eventType");

-- CreateIndex
CREATE INDEX "AcquisitionEvent_timestamp_idx" ON "AcquisitionEvent"("timestamp");

-- CreateIndex
CREATE INDEX "AcquisitionEvent_source_medium_timestamp_idx" ON "AcquisitionEvent"("source", "medium", "timestamp");

-- CreateIndex
CREATE INDEX "SystemHealthMetric_timestamp_idx" ON "SystemHealthMetric"("timestamp");

-- CreateIndex
CREATE INDEX "SystemHealthMetric_metricName_idx" ON "SystemHealthMetric"("metricName");

-- CreateIndex
CREATE INDEX "SystemHealthMetric_service_idx" ON "SystemHealthMetric"("service");

-- CreateIndex
CREATE INDEX "SystemHealthMetric_timestamp_metricName_idx" ON "SystemHealthMetric"("timestamp", "metricName");

-- CreateIndex
CREATE INDEX "ApiEndpointMetrics_date_idx" ON "ApiEndpointMetrics"("date");

-- CreateIndex
CREATE INDEX "ApiEndpointMetrics_path_idx" ON "ApiEndpointMetrics"("path");

-- CreateIndex
CREATE INDEX "ApiEndpointMetrics_errorRate_idx" ON "ApiEndpointMetrics"("errorRate");

-- CreateIndex
CREATE UNIQUE INDEX "ApiEndpointMetrics_date_method_path_key" ON "ApiEndpointMetrics"("date", "method", "path");

-- CreateIndex
CREATE INDEX "GeneratedDocument_userId_idx" ON "GeneratedDocument"("userId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_organizationId_idx" ON "GeneratedDocument"("organizationId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_documentType_idx" ON "GeneratedDocument"("documentType");

-- CreateIndex
CREATE INDEX "GeneratedDocument_userId_documentType_idx" ON "GeneratedDocument"("userId", "documentType");

-- CreateIndex
CREATE INDEX "UserConsent_userId_idx" ON "UserConsent"("userId");

-- CreateIndex
CREATE INDEX "UserConsent_consentType_idx" ON "UserConsent"("consentType");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_userId_consentType_key" ON "UserConsent"("userId", "consentType");

-- CreateIndex
CREATE INDEX "BreachReport_status_idx" ON "BreachReport"("status");

-- CreateIndex
CREATE INDEX "BreachReport_severity_idx" ON "BreachReport"("severity");

-- CreateIndex
CREATE INDEX "BreachReport_organizationId_idx" ON "BreachReport"("organizationId");

-- CreateIndex
CREATE INDEX "BreachReport_reportedById_idx" ON "BreachReport"("reportedById");

-- CreateIndex
CREATE INDEX "BreachReport_discoveredAt_idx" ON "BreachReport"("discoveredAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleStatus" ADD CONSTRAINT "ArticleStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistStatus" ADD CONSTRAINT "ChecklistStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationWorkflow" ADD CONSTRAINT "AuthorizationWorkflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationDocument" ADD CONSTRAINT "AuthorizationDocument_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AuthorizationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebrisAssessment" ADD CONSTRAINT "DebrisAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebrisRequirementStatus" ADD CONSTRAINT "DebrisRequirementStatus_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "DebrisAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CybersecurityAssessment" ADD CONSTRAINT "CybersecurityAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CybersecurityRequirementStatus" ADD CONSTRAINT "CybersecurityRequirementStatus_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "CybersecurityAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NIS2Assessment" ADD CONSTRAINT "NIS2Assessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NIS2RequirementStatus" ADD CONSTRAINT "NIS2RequirementStatus_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "NIS2Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceAssessment" ADD CONSTRAINT "InsuranceAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "InsuranceAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentalAssessment" ADD CONSTRAINT "EnvironmentalAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentalImpactResult" ADD CONSTRAINT "EnvironmentalImpactResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "EnvironmentalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDataRequest" ADD CONSTRAINT "SupplierDataRequest_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "EnvironmentalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPortalToken" ADD CONSTRAINT "SupplierPortalToken_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SupplierDataRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopuosAssessment" ADD CONSTRAINT "CopuosAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopuosGuidelineStatus" ADD CONSTRAINT "CopuosGuidelineStatus_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "CopuosAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UkSpaceAssessment" ADD CONSTRAINT "UkSpaceAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UkRequirementStatus" ADD CONSTRAINT "UkRequirementStatus_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "UkSpaceAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsRegulatoryAssessment" ADD CONSTRAINT "UsRegulatoryAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsRequirementStatus" ADD CONSTRAINT "UsRequirementStatus_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "UsRegulatoryAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportControlAssessment" ADD CONSTRAINT "ExportControlAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportControlRequirementStatus" ADD CONSTRAINT "ExportControlRequirementStatus_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ExportControlAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpectrumAssessment" ADD CONSTRAINT "SpectrumAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpectrumRequirementStatus" ADD CONSTRAINT "SpectrumRequirementStatus_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "SpectrumAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionConfig" ADD CONSTRAINT "SupervisionConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_supervisionId_fkey" FOREIGN KEY ("supervisionId") REFERENCES "SupervisionConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAsset" ADD CONSTRAINT "IncidentAsset_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAttachment" ADD CONSTRAINT "IncidentAttachment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionReport" ADD CONSTRAINT "SupervisionReport_supervisionId_fkey" FOREIGN KEY ("supervisionId") REFERENCES "SupervisionConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionReport" ADD CONSTRAINT "SupervisionReport_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionReport" ADD CONSTRAINT "SupervisionReport_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionCalendarEvent" ADD CONSTRAINT "SupervisionCalendarEvent_supervisionId_fkey" FOREIGN KEY ("supervisionId") REFERENCES "SupervisionConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Deadline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionPhase" ADD CONSTRAINT "MissionPhase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "MissionPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocumentComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportArchive" ADD CONSTRAINT "ReportArchive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportArchive" ADD CONSTRAINT "ReportArchive_scheduledReportId_fkey" FOREIGN KEY ("scheduledReportId") REFERENCES "ScheduledReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NCASubmission" ADD CONSTRAINT "NCASubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NCASubmission" ADD CONSTRAINT "NCASubmission_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SupervisionReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NCASubmission" ADD CONSTRAINT "NCASubmission_originalSubmissionId_fkey" FOREIGN KEY ("originalSubmissionId") REFERENCES "NCASubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NCASubmission" ADD CONSTRAINT "NCASubmission_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SubmissionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NCACorrespondence" ADD CONSTRAINT "NCACorrespondence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "NCASubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionPackage" ADD CONSTRAINT "SubmissionPackage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionPackage" ADD CONSTRAINT "SubmissionPackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spacecraft" ADD CONSTRAINT "Spacecraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceObjectRegistration" ADD CONSTRAINT "SpaceObjectRegistration_spacecraftId_fkey" FOREIGN KEY ("spacecraftId") REFERENCES "Spacecraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceObjectRegistration" ADD CONSTRAINT "SpaceObjectRegistration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationStatusHistory" ADD CONSTRAINT "RegistrationStatusHistory_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "SpaceObjectRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationAttachment" ADD CONSTRAINT "RegistrationAttachment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "SpaceObjectRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SSOConnection" ADD CONSTRAINT "SSOConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaConfig" ADD CONSTRAINT "MfaConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAuthnCredential" ADD CONSTRAINT "WebAuthnCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAuditLog" ADD CONSTRAINT "SecurityAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoneyTokenTrigger" ADD CONSTRAINT "HoneyTokenTrigger_honeyTokenId_fkey" FOREIGN KEY ("honeyTokenId") REFERENCES "HoneyToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetConfig" ADD CONSTRAINT "WidgetConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetConfig" ADD CONSTRAINT "WidgetConfig_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiRequest" ADD CONSTRAINT "ApiRequest_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidenceDocument" ADD CONSTRAINT "ComplianceEvidenceDocument_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "ComplianceEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidenceDocument" ADD CONSTRAINT "ComplianceEvidenceDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AstraConversation" ADD CONSTRAINT "AstraConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AstraConversation" ADD CONSTRAINT "AstraConversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AstraMessage" ADD CONSTRAINT "AstraMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AstraConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerHealthScore" ADD CONSTRAINT "CustomerHealthScore_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GeneratedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreachReport" ADD CONSTRAINT "BreachReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreachReport" ADD CONSTRAINT "BreachReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.4.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
