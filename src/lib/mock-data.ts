export interface Recording {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  thumbnailUrl: string;
  presenter: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  series?: {
    id: string;
    name: string;
  };
  tags: string[];
  views: number;
  status: "processing" | "ready" | "failed";
  hasTranscript: boolean;
  hasSummary: boolean;
  recordedAt: Date;
  createdAt: Date;
}

export interface Series {
  id: string;
  name: string;
  description: string;
  recordingCount: number;
  coverColor: string; // tailwind gradient classes
}

export interface DashboardStats {
  totalRecordings: number;
  totalWatchTime: number; // hours
  activeViewers: number;
  thisWeekUploads: number;
}

// ---------------------------------------------------------------------------
// Presenters
// ---------------------------------------------------------------------------

const presenters = {
  krishna: {
    id: "p-1",
    name: "Krishna Mohan",
    role: "Principal Engineer",
  },
  aditya: {
    id: "p-2",
    name: "Aditya Singh",
    role: "Staff Engineer",
  },
  harsha: {
    id: "p-3",
    name: "Harshavardhana",
    role: "CTO & Co-founder",
  },
  farhan: {
    id: "p-4",
    name: "Farhan Patel",
    role: "Senior Engineer",
  },
  priya: {
    id: "p-5",
    name: "Priya Sharma",
    role: "Security Engineer",
  },
  anand: {
    id: "p-6",
    name: "Anand Babu",
    role: "CEO & Co-founder",
  },
} as const;

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

export const mockSeries: Series[] = [
  {
    id: "s-1",
    name: "Internal Learning Series",
    description:
      "Weekly internal sessions covering core MinIO architecture and design decisions.",
    recordingCount: 18,
    coverColor: "from-indigo-500 to-purple-600",
  },
  {
    id: "s-2",
    name: "Engineering Deep Dives",
    description:
      "In-depth explorations of critical subsystems, performance characteristics, and implementation details.",
    recordingCount: 12,
    coverColor: "from-emerald-500 to-teal-600",
  },
  {
    id: "s-3",
    name: "Product Workshops",
    description:
      "Hands-on workshops for feature development, SDK usage, and integration patterns.",
    recordingCount: 9,
    coverColor: "from-orange-500 to-rose-600",
  },
  {
    id: "s-4",
    name: "Onboarding",
    description:
      "Essential recordings for new team members covering tooling, processes, and architecture overview.",
    recordingCount: 8,
    coverColor: "from-sky-500 to-blue-600",
  },
];

// ---------------------------------------------------------------------------
// Helper to create dates relative to today
// ---------------------------------------------------------------------------

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 30, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Mock Recordings
// ---------------------------------------------------------------------------

export const mockRecordings: Recording[] = [
  {
    id: "rec-01",
    title: "Erasure Coding Deep Dive - How MinIO Distributes Data",
    description:
      "A comprehensive walkthrough of MinIO's erasure coding implementation, covering Reed-Solomon algorithms, data and parity shard distribution across drives, and how the system achieves both high availability and storage efficiency.",
    duration: 3720, // 1h 2m
    thumbnailUrl: "",
    presenter: presenters.krishna,
    series: { id: mockSeries[1].id, name: mockSeries[1].name },
    tags: ["erasure-coding", "architecture", "storage"],
    views: 342,
    status: "ready",
    hasTranscript: true,
    hasSummary: true,
    recordedAt: daysAgo(2),
    createdAt: daysAgo(2),
  },
  {
    id: "rec-02",
    title: "Understanding Object Storage Architecture",
    description:
      "An overview of how MinIO organizes objects across pools, sets, and drives. Covers the XL metadata format, versioning internals, and how the namespace is partitioned for maximum parallelism.",
    duration: 2940, // 49m
    thumbnailUrl: "",
    presenter: presenters.harsha,
    series: { id: mockSeries[0].id, name: mockSeries[0].name },
    tags: ["architecture", "storage"],
    views: 891,
    status: "ready",
    hasTranscript: true,
    hasSummary: true,
    recordedAt: daysAgo(5),
    createdAt: daysAgo(5),
  },
  {
    id: "rec-03",
    title: "Healing & Rebalancing in Distributed Systems",
    description:
      "How MinIO automatically detects and repairs bitrot, missing shards, and stale data after drive replacements. Includes a live demo of the healing pipeline and scanner architecture.",
    duration: 2580, // 43m
    thumbnailUrl: "",
    presenter: presenters.aditya,
    series: { id: mockSeries[1].id, name: mockSeries[1].name },
    tags: ["architecture", "distributed-systems"],
    views: 467,
    status: "ready",
    hasTranscript: true,
    hasSummary: false,
    recordedAt: daysAgo(3),
    createdAt: daysAgo(3),
  },
  {
    id: "rec-04",
    title: "Multi-Part Upload Internals",
    description:
      "Deep dive into how MinIO handles multi-part uploads, including part staging, completion semantics, lifecycle of incomplete uploads, and the impact on erasure sets.",
    duration: 1860, // 31m
    thumbnailUrl: "",
    presenter: presenters.farhan,
    series: { id: mockSeries[1].id, name: mockSeries[1].name },
    tags: ["s3", "architecture"],
    views: 215,
    status: "ready",
    hasTranscript: true,
    hasSummary: true,
    recordedAt: daysAgo(7),
    createdAt: daysAgo(7),
  },
  {
    id: "rec-05",
    title: "Pool Decommissioning Best Practices",
    description:
      "Step-by-step guide to safely decommissioning storage pools in production. Covers data migration planning, monitoring progress, rollback strategies, and common pitfalls to avoid.",
    duration: 2220, // 37m
    thumbnailUrl: "",
    presenter: presenters.krishna,
    series: { id: mockSeries[2].id, name: mockSeries[2].name },
    tags: ["storage", "best-practices"],
    views: 178,
    status: "ready",
    hasTranscript: false,
    hasSummary: false,
    recordedAt: daysAgo(10),
    createdAt: daysAgo(10),
  },
  {
    id: "rec-06",
    title: "S3 API Compatibility Layer",
    description:
      "How MinIO implements the S3 API spec, including edge cases in ListObjects, GetObject with range headers, bucket policies, and the nuances of eventual vs. strict consistency.",
    duration: 3180, // 53m
    thumbnailUrl: "",
    presenter: presenters.harsha,
    series: { id: mockSeries[0].id, name: mockSeries[0].name },
    tags: ["s3", "api", "compatibility"],
    views: 1243,
    status: "ready",
    hasTranscript: true,
    hasSummary: true,
    recordedAt: daysAgo(12),
    createdAt: daysAgo(12),
  },
  {
    id: "rec-07",
    title: "Kubernetes Operator Deep Dive",
    description:
      "Comprehensive session on the MinIO Kubernetes Operator: CRD design, tenant lifecycle management, TLS certificate rotation, and auto-scaling strategies for cloud-native deployments.",
    duration: 4020, // 1h 7m
    thumbnailUrl: "",
    presenter: presenters.aditya,
    series: { id: mockSeries[1].id, name: mockSeries[1].name },
    tags: ["kubernetes", "cloud-native"],
    views: 756,
    status: "ready",
    hasTranscript: true,
    hasSummary: true,
    recordedAt: daysAgo(14),
    createdAt: daysAgo(14),
  },
  {
    id: "rec-08",
    title: "Performance Tuning for Large Objects",
    description:
      "Benchmarking and tuning MinIO for large object workloads (100 MB+). Covers network buffer sizes, drive I/O scheduling, erasure shard sizing, and kernel tuning for NVMe arrays.",
    duration: 2760, // 46m
    thumbnailUrl: "",
    presenter: presenters.farhan,
    series: { id: mockSeries[2].id, name: mockSeries[2].name },
    tags: ["performance", "tuning"],
    views: 523,
    status: "ready",
    hasTranscript: true,
    hasSummary: false,
    recordedAt: daysAgo(1),
    createdAt: daysAgo(1),
  },
  {
    id: "rec-09",
    title: "IAM Policies & Access Control",
    description:
      "Everything about MinIO's IAM system: policy document syntax, built-in policies, LDAP/AD integration, OpenID Connect federation, and real-world policy examples for multi-tenant environments.",
    duration: 3360, // 56m
    thumbnailUrl: "",
    presenter: presenters.priya,
    series: { id: mockSeries[0].id, name: mockSeries[0].name },
    tags: ["security", "access-control"],
    views: 634,
    status: "ready",
    hasTranscript: true,
    hasSummary: true,
    recordedAt: daysAgo(8),
    createdAt: daysAgo(8),
  },
  {
    id: "rec-10",
    title: "Monitoring & Alerting with Prometheus",
    description:
      "Setting up comprehensive monitoring for MinIO clusters using Prometheus and Grafana. Covers key metrics to watch, alerting rules for disk failures, and custom dashboard creation.",
    duration: 2100, // 35m
    thumbnailUrl: "",
    presenter: presenters.farhan,
    series: { id: mockSeries[2].id, name: mockSeries[2].name },
    tags: ["monitoring", "prometheus"],
    views: 389,
    status: "ready",
    hasTranscript: true,
    hasSummary: true,
    recordedAt: daysAgo(15),
    createdAt: daysAgo(15),
  },
  {
    id: "rec-11",
    title: "Client SDK Development Workshop",
    description:
      "Hands-on workshop building a custom MinIO client from scratch. Covers the mc CLI internals, Go SDK architecture, S3 signing (v4), retry logic, and connection pooling best practices.",
    duration: 4500, // 1h 15m
    thumbnailUrl: "",
    presenter: presenters.aditya,
    series: { id: mockSeries[2].id, name: mockSeries[2].name },
    tags: ["sdk", "workshop", "development"],
    views: 298,
    status: "ready",
    hasTranscript: false,
    hasSummary: false,
    recordedAt: daysAgo(20),
    createdAt: daysAgo(20),
  },
  {
    id: "rec-12",
    title: "Data Encryption at Rest & in Transit",
    description:
      "MinIO's encryption architecture: SSE-S3, SSE-C, SSE-KMS with Vault integration, TLS configuration, key rotation strategies, and compliance considerations for regulated industries.",
    duration: 3000, // 50m
    thumbnailUrl: "",
    presenter: presenters.priya,
    series: { id: mockSeries[0].id, name: mockSeries[0].name },
    tags: ["security", "encryption"],
    views: 412,
    status: "ready",
    hasTranscript: true,
    hasSummary: true,
    recordedAt: daysAgo(6),
    createdAt: daysAgo(6),
  },
  {
    id: "rec-13",
    title: "Bucket Notifications & Event-Driven Architectures",
    description:
      "How to leverage MinIO bucket notifications with Kafka, NATS, and webhooks to build event-driven data pipelines. Includes live demos and architecture patterns.",
    duration: 2400, // 40m
    thumbnailUrl: "",
    presenter: presenters.krishna,
    series: { id: mockSeries[0].id, name: mockSeries[0].name },
    tags: ["events", "architecture"],
    views: 187,
    status: "ready",
    hasTranscript: true,
    hasSummary: false,
    recordedAt: daysAgo(18),
    createdAt: daysAgo(18),
  },
  {
    id: "rec-14",
    title: "Site Replication & Disaster Recovery",
    description:
      "Configuring active-active site replication across geographies. Covers replication queues, conflict resolution, bandwidth throttling, and DR failover playbooks.",
    duration: 3600, // 1h
    thumbnailUrl: "",
    presenter: presenters.harsha,
    series: { id: mockSeries[1].id, name: mockSeries[1].name },
    tags: ["replication", "disaster-recovery"],
    views: 567,
    status: "ready",
    hasTranscript: true,
    hasSummary: true,
    recordedAt: daysAgo(22),
    createdAt: daysAgo(22),
  },
  {
    id: "rec-15",
    title: "New Engineer Onboarding: Codebase Tour",
    description:
      "A guided tour of the MinIO codebase for new engineers. Covers repository structure, build system, testing patterns, CI/CD pipeline, and how to submit your first PR.",
    duration: 5400, // 1h 30m
    thumbnailUrl: "",
    presenter: presenters.anand,
    series: { id: mockSeries[3].id, name: mockSeries[3].name },
    tags: ["onboarding", "development"],
    views: 1567,
    status: "ready",
    hasTranscript: true,
    hasSummary: true,
    recordedAt: daysAgo(30),
    createdAt: daysAgo(30),
  },
  {
    id: "rec-16",
    title: "Object Lifecycle Management & ILM Tiers",
    description:
      "Configuring Information Lifecycle Management in MinIO: transition rules, expiration policies, tiering to remote storage, and cost optimization strategies.",
    duration: 1980, // 33m
    thumbnailUrl: "",
    presenter: presenters.farhan,
    series: { id: mockSeries[0].id, name: mockSeries[0].name },
    tags: ["storage", "lifecycle"],
    views: 245,
    status: "processing",
    hasTranscript: false,
    hasSummary: false,
    recordedAt: daysAgo(0),
    createdAt: daysAgo(0),
  },
];

// ---------------------------------------------------------------------------
// Continue Watching (recordings with progress)
// ---------------------------------------------------------------------------

export interface ContinueWatchingItem {
  recording: Recording;
  progress: number; // 0-100 percentage
  lastWatchedAt: Date;
}

export const mockContinueWatching: ContinueWatchingItem[] = [
  {
    recording: mockRecordings[0], // Erasure Coding
    progress: 62,
    lastWatchedAt: daysAgo(0),
  },
  {
    recording: mockRecordings[6], // K8s Operator
    progress: 35,
    lastWatchedAt: daysAgo(1),
  },
  {
    recording: mockRecordings[8], // IAM Policies
    progress: 78,
    lastWatchedAt: daysAgo(2),
  },
  {
    recording: mockRecordings[13], // Site Replication
    progress: 15,
    lastWatchedAt: daysAgo(3),
  },
];

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export const mockDashboardStats: DashboardStats = {
  totalRecordings: 47,
  totalWatchTime: 156,
  activeViewers: 28,
  thisWeekUploads: 3,
};

// ---------------------------------------------------------------------------
// Thumbnail gradient palettes (deterministic by recording index)
// ---------------------------------------------------------------------------

export const thumbnailGradients = [
  "from-violet-600 via-purple-500 to-indigo-600",
  "from-rose-500 via-pink-500 to-fuchsia-600",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-sky-500 via-blue-500 to-indigo-500",
  "from-lime-500 via-green-500 to-emerald-600",
  "from-fuchsia-500 via-pink-500 to-rose-500",
  "from-cyan-500 via-teal-500 to-emerald-500",
  "from-orange-500 via-amber-500 to-yellow-500",
  "from-indigo-500 via-violet-500 to-purple-600",
  "from-teal-500 via-cyan-500 to-sky-500",
  "from-red-500 via-rose-500 to-pink-500",
  "from-blue-600 via-indigo-500 to-violet-500",
  "from-green-500 via-emerald-500 to-teal-600",
  "from-purple-600 via-fuchsia-500 to-pink-500",
  "from-yellow-500 via-amber-500 to-orange-500",
] as const;

export function getGradientForRecording(id: string): string {
  const index = parseInt(id.replace(/\D/g, ""), 10) || 0;
  return thumbnailGradients[index % thumbnailGradients.length];
}
