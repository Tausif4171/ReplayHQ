import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.embedding.deleteMany();
  await prisma.playlistItem.deleteMany();
  await prisma.playlist.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.watchHistory.deleteMany();
  await prisma.recording.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.series.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing data");

  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "krishna@minio.io",
        name: "Krishna Mohan",
        role: "ADMIN",
        image: null,
      },
    }),
    prisma.user.create({
      data: {
        email: "aditya@minio.io",
        name: "Aditya Singh",
        role: "UPLOADER",
        image: null,
      },
    }),
    prisma.user.create({
      data: {
        email: "harsha@minio.io",
        name: "Harshavardhana",
        role: "ADMIN",
        image: null,
      },
    }),
    prisma.user.create({
      data: {
        email: "farhan@minio.io",
        name: "Farhan Patel",
        role: "UPLOADER",
        image: null,
      },
    }),
    prisma.user.create({
      data: {
        email: "priya@minio.io",
        name: "Priya Sharma",
        role: "UPLOADER",
        image: null,
      },
    }),
    prisma.user.create({
      data: {
        email: "anand@minio.io",
        name: "Anand Babu",
        role: "ADMIN",
        image: null,
      },
    }),
    prisma.user.create({
      data: {
        email: "tausif@minio.io",
        name: "Tausif Khan",
        role: "ADMIN",
        image: null,
      },
    }),
  ]);

  const [krishna, aditya, harsha, farhan, priya, anand, tausif] = users;
  console.log(`Created ${users.length} users`);

  // Create series
  const series = await Promise.all([
    prisma.series.create({
      data: {
        name: "Internal Learning Series",
        description: "Weekly internal sessions covering core MinIO architecture and design decisions.",
      },
    }),
    prisma.series.create({
      data: {
        name: "Engineering Deep Dives",
        description: "In-depth explorations of critical subsystems, performance characteristics, and implementation details.",
      },
    }),
    prisma.series.create({
      data: {
        name: "Product Workshops",
        description: "Hands-on workshops for feature development, SDK usage, and integration patterns.",
      },
    }),
    prisma.series.create({
      data: {
        name: "Onboarding",
        description: "Essential recordings for new team members covering tooling, processes, and architecture overview.",
      },
    }),
  ]);

  const [learning, deepDives, workshops, onboarding] = series;
  console.log(`Created ${series.length} series`);

  // Create tags
  const tagNames = [
    "erasure-coding", "architecture", "storage", "distributed-systems",
    "s3", "api", "compatibility", "kubernetes", "cloud-native",
    "performance", "tuning", "security", "access-control", "monitoring",
    "prometheus", "sdk", "workshop", "development", "encryption",
    "events", "replication", "disaster-recovery", "onboarding",
    "best-practices", "lifecycle",
  ];

  const tags: Record<string, any> = {};
  for (const name of tagNames) {
    tags[name] = await prisma.tag.create({ data: { name } });
  }
  console.log(`Created ${tagNames.length} tags`);

  // Helper for relative dates
  function daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(10, 30, 0, 0);
    return d;
  }

  // Create recordings
  const recordings = await Promise.all([
    prisma.recording.create({
      data: {
        title: "Erasure Coding Deep Dive - How MinIO Distributes Data",
        description: "A comprehensive walkthrough of MinIO's erasure coding implementation, covering Reed-Solomon algorithms, data and parity shard distribution across drives, and how the system achieves both high availability and storage efficiency.",
        duration: 3720,
        videoUrl: "recordings/erasure-coding-deep-dive.mp4",
        status: "READY",
        presenterId: krishna.id,
        uploadedById: krishna.id,
        seriesId: deepDives.id,
        tags: { connect: [{ name: "erasure-coding" }, { name: "architecture" }, { name: "storage" }] },
        transcript: "Welcome everyone to today's deep dive on erasure coding...",
        summary: "This session covers MinIO's erasure coding implementation including Reed-Solomon algorithms, shard distribution, and high availability strategies.",
        keyTakeaways: JSON.stringify([
          "MinIO uses Reed-Solomon erasure coding for data protection",
          "Data is split into data and parity shards across drives",
          "System can tolerate up to half the drives failing",
          "Erasure coding is more storage-efficient than replication",
          "Healing happens automatically in the background"
        ]),
        tldr: "MinIO uses Reed-Solomon erasure coding to distribute data across drives, achieving the same durability as 3x replication at just 1.5x storage overhead. The system leverages SIMD/ISA-L optimizations for fast encoding and automatic background healing for drive failures.",
        recordedAt: daysAgo(2),
        createdAt: daysAgo(2),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Understanding Object Storage Architecture",
        description: "An overview of how MinIO organizes objects across pools, sets, and drives. Covers the XL metadata format, versioning internals, and how the namespace is partitioned for maximum parallelism.",
        duration: 2940,
        videoUrl: "recordings/object-storage-architecture.mp4",
        status: "READY",
        presenterId: harsha.id,
        uploadedById: harsha.id,
        seriesId: learning.id,
        tags: { connect: [{ name: "architecture" }, { name: "storage" }] },
        transcript: "Good morning everyone. Today I want to walk you through the fundamentals of our object storage architecture...",
        summary: "Overview of MinIO's object storage organization including pools, sets, drives, XL metadata format, and namespace partitioning.",
        recordedAt: daysAgo(5),
        createdAt: daysAgo(5),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Healing & Rebalancing in Distributed Systems",
        description: "How MinIO automatically detects and repairs bitrot, missing shards, and stale data after drive replacements. Includes a live demo of the healing pipeline and scanner architecture.",
        duration: 2580,
        videoUrl: "recordings/healing-rebalancing.mp4",
        status: "READY",
        presenterId: aditya.id,
        uploadedById: aditya.id,
        seriesId: deepDives.id,
        tags: { connect: [{ name: "architecture" }, { name: "distributed-systems" }] },
        recordedAt: daysAgo(3),
        createdAt: daysAgo(3),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Multi-Part Upload Internals",
        description: "Deep dive into how MinIO handles multi-part uploads, including part staging, completion semantics, lifecycle of incomplete uploads, and the impact on erasure sets.",
        duration: 1860,
        videoUrl: "recordings/multipart-upload.mp4",
        status: "READY",
        presenterId: farhan.id,
        uploadedById: farhan.id,
        seriesId: deepDives.id,
        tags: { connect: [{ name: "s3" }, { name: "architecture" }] },
        transcript: "Let's look at how multipart uploads work under the hood...",
        summary: "Deep dive into MinIO's multipart upload handling covering staging, completion semantics, and erasure set impact.",
        recordedAt: daysAgo(7),
        createdAt: daysAgo(7),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Pool Decommissioning Best Practices",
        description: "Step-by-step guide to safely decommissioning storage pools in production.",
        duration: 2220,
        videoUrl: "recordings/pool-decommissioning.mp4",
        status: "READY",
        presenterId: krishna.id,
        uploadedById: krishna.id,
        seriesId: workshops.id,
        tags: { connect: [{ name: "storage" }, { name: "best-practices" }] },
        recordedAt: daysAgo(10),
        createdAt: daysAgo(10),
      },
    }),
    prisma.recording.create({
      data: {
        title: "S3 API Compatibility Layer",
        description: "How MinIO implements the S3 API spec, including edge cases in ListObjects, GetObject with range headers, bucket policies, and consistency semantics.",
        duration: 3180,
        videoUrl: "recordings/s3-api-compatibility.mp4",
        status: "READY",
        presenterId: harsha.id,
        uploadedById: harsha.id,
        seriesId: learning.id,
        tags: { connect: [{ name: "s3" }, { name: "api" }, { name: "compatibility" }] },
        transcript: "Today we're going to examine our S3 compatibility layer in detail...",
        summary: "Examination of MinIO's S3 API compatibility including ListObjects, GetObject, bucket policies, and consistency model.",
        keyTakeaways: JSON.stringify([
          "MinIO implements over 95% of the S3 API surface",
          "Strict consistency is the default behavior",
          "Bucket policies follow AWS IAM policy syntax",
          "Range headers are fully supported for partial reads"
        ]),
        recordedAt: daysAgo(12),
        createdAt: daysAgo(12),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Kubernetes Operator Deep Dive",
        description: "Comprehensive session on the MinIO Kubernetes Operator: CRD design, tenant lifecycle management, TLS certificate rotation, and auto-scaling strategies.",
        duration: 4020,
        videoUrl: "recordings/k8s-operator.mp4",
        status: "READY",
        presenterId: aditya.id,
        uploadedById: aditya.id,
        seriesId: deepDives.id,
        tags: { connect: [{ name: "kubernetes" }, { name: "cloud-native" }] },
        transcript: "Welcome to the K8s operator deep dive. We'll cover CRDs, tenant management, and more...",
        summary: "Deep dive into the MinIO Kubernetes Operator covering CRD design, tenant lifecycle, TLS rotation, and auto-scaling.",
        recordedAt: daysAgo(14),
        createdAt: daysAgo(14),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Performance Tuning for Large Objects",
        description: "Benchmarking and tuning MinIO for large object workloads (100 MB+).",
        duration: 2760,
        videoUrl: "recordings/performance-tuning.mp4",
        status: "READY",
        presenterId: farhan.id,
        uploadedById: farhan.id,
        seriesId: workshops.id,
        tags: { connect: [{ name: "performance" }, { name: "tuning" }] },
        recordedAt: daysAgo(1),
        createdAt: daysAgo(1),
      },
    }),
    prisma.recording.create({
      data: {
        title: "IAM Policies & Access Control",
        description: "Everything about MinIO's IAM system: policy document syntax, LDAP/AD integration, OpenID Connect federation, and multi-tenant policy examples.",
        duration: 3360,
        videoUrl: "recordings/iam-policies.mp4",
        status: "READY",
        presenterId: priya.id,
        uploadedById: priya.id,
        seriesId: learning.id,
        tags: { connect: [{ name: "security" }, { name: "access-control" }] },
        transcript: "Security is fundamental to any storage system. Today we'll look at IAM...",
        summary: "Comprehensive guide to MinIO IAM covering policy syntax, LDAP integration, OIDC federation, and multi-tenant patterns.",
        keyTakeaways: JSON.stringify([
          "MinIO IAM follows AWS IAM policy syntax",
          "LDAP and Active Directory integration is supported",
          "OpenID Connect can be used for SSO",
          "Multi-tenant environments need careful policy design"
        ]),
        recordedAt: daysAgo(8),
        createdAt: daysAgo(8),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Monitoring & Alerting with Prometheus",
        description: "Setting up comprehensive monitoring for MinIO clusters using Prometheus and Grafana.",
        duration: 2100,
        videoUrl: "recordings/monitoring-prometheus.mp4",
        status: "READY",
        presenterId: farhan.id,
        uploadedById: farhan.id,
        seriesId: workshops.id,
        tags: { connect: [{ name: "monitoring" }, { name: "prometheus" }] },
        transcript: "Let me show you how to set up production-grade monitoring...",
        summary: "Guide to monitoring MinIO with Prometheus and Grafana including key metrics, alerting rules, and custom dashboards.",
        recordedAt: daysAgo(15),
        createdAt: daysAgo(15),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Client SDK Development Workshop",
        description: "Hands-on workshop building a custom MinIO client from scratch.",
        duration: 4500,
        videoUrl: "recordings/sdk-workshop.mp4",
        status: "READY",
        presenterId: aditya.id,
        uploadedById: aditya.id,
        seriesId: workshops.id,
        tags: { connect: [{ name: "sdk" }, { name: "workshop" }, { name: "development" }] },
        recordedAt: daysAgo(20),
        createdAt: daysAgo(20),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Data Encryption at Rest & in Transit",
        description: "MinIO's encryption architecture: SSE-S3, SSE-C, SSE-KMS with Vault integration, TLS configuration, and key rotation.",
        duration: 3000,
        videoUrl: "recordings/data-encryption.mp4",
        status: "READY",
        presenterId: priya.id,
        uploadedById: priya.id,
        seriesId: learning.id,
        tags: { connect: [{ name: "security" }, { name: "encryption" }] },
        transcript: "Encryption is crucial for compliance and data protection...",
        summary: "Complete guide to MinIO encryption covering SSE-S3, SSE-C, SSE-KMS, TLS, and key rotation strategies.",
        recordedAt: daysAgo(6),
        createdAt: daysAgo(6),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Bucket Notifications & Event-Driven Architectures",
        description: "How to leverage MinIO bucket notifications with Kafka, NATS, and webhooks for event-driven pipelines.",
        duration: 2400,
        videoUrl: "recordings/bucket-notifications.mp4",
        status: "READY",
        presenterId: krishna.id,
        uploadedById: krishna.id,
        seriesId: learning.id,
        tags: { connect: [{ name: "events" }, { name: "architecture" }] },
        recordedAt: daysAgo(18),
        createdAt: daysAgo(18),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Site Replication & Disaster Recovery",
        description: "Configuring active-active site replication across geographies.",
        duration: 3600,
        videoUrl: "recordings/site-replication.mp4",
        status: "READY",
        presenterId: harsha.id,
        uploadedById: harsha.id,
        seriesId: deepDives.id,
        tags: { connect: [{ name: "replication" }, { name: "disaster-recovery" }] },
        transcript: "Disaster recovery is not optional. Let's look at site replication...",
        summary: "Guide to MinIO site replication covering active-active setup, replication queues, conflict resolution, and DR failover.",
        recordedAt: daysAgo(22),
        createdAt: daysAgo(22),
      },
    }),
    prisma.recording.create({
      data: {
        title: "New Engineer Onboarding: Codebase Tour",
        description: "A guided tour of the MinIO codebase for new engineers.",
        duration: 5400,
        videoUrl: "recordings/codebase-tour.mp4",
        status: "READY",
        presenterId: anand.id,
        uploadedById: anand.id,
        seriesId: onboarding.id,
        tags: { connect: [{ name: "onboarding" }, { name: "development" }] },
        transcript: "Welcome to MinIO! This recording will guide you through our codebase...",
        summary: "Complete codebase tour for new engineers covering repo structure, build system, testing, CI/CD, and PR process.",
        keyTakeaways: JSON.stringify([
          "The main repo is organized by subsystems",
          "Use make to build and test locally",
          "CI runs on every PR automatically",
          "Start with good-first-issue labels"
        ]),
        recordedAt: daysAgo(30),
        createdAt: daysAgo(30),
      },
    }),
    prisma.recording.create({
      data: {
        title: "Object Lifecycle Management & ILM Tiers",
        description: "Configuring Information Lifecycle Management in MinIO.",
        duration: 1980,
        videoUrl: "recordings/ilm-tiers.mp4",
        status: "PROCESSING",
        presenterId: farhan.id,
        uploadedById: farhan.id,
        seriesId: learning.id,
        tags: { connect: [{ name: "storage" }, { name: "lifecycle" }] },
        recordedAt: daysAgo(0),
        createdAt: daysAgo(0),
      },
    }),
  ]);

  console.log(`Created ${recordings.length} recordings`);

  // Create watch history for tausif
  await Promise.all([
    prisma.watchHistory.create({
      data: {
        userId: tausif.id,
        recordingId: recordings[0].id,
        progress: Math.round(recordings[0].duration! * 0.62),
        lastWatchedAt: daysAgo(0),
      },
    }),
    prisma.watchHistory.create({
      data: {
        userId: tausif.id,
        recordingId: recordings[6].id,
        progress: Math.round(recordings[6].duration! * 0.35),
        lastWatchedAt: daysAgo(1),
      },
    }),
    prisma.watchHistory.create({
      data: {
        userId: tausif.id,
        recordingId: recordings[8].id,
        progress: Math.round(recordings[8].duration! * 0.78),
        lastWatchedAt: daysAgo(2),
      },
    }),
  ]);

  console.log("Created watch history");

  // Create comments
  await Promise.all([
    prisma.comment.create({
      data: {
        content: "Great explanation of the Reed-Solomon algorithm! The visual diagrams really helped.",
        timestamp: 420,
        userId: aditya.id,
        recordingId: recordings[0].id,
      },
    }),
    prisma.comment.create({
      data: {
        content: "Could we do a follow-up session on how healing interacts with erasure coding?",
        timestamp: 1800,
        userId: farhan.id,
        recordingId: recordings[0].id,
      },
    }),
    prisma.comment.create({
      data: {
        content: "This is essential viewing for all new engineers. Bookmarked!",
        userId: tausif.id,
        recordingId: recordings[14].id,
      },
    }),
    prisma.comment.create({
      data: {
        content: "The IAM policy examples at 15:00 are exactly what I needed for our multi-tenant setup.",
        timestamp: 900,
        userId: krishna.id,
        recordingId: recordings[8].id,
      },
    }),
  ]);

  console.log("Created comments");

  // Create playlists
  const onboardingPlaylist = await prisma.playlist.create({
    data: {
      name: "New Engineer Starter Pack",
      description: "Must-watch recordings for your first two weeks at MinIO.",
      isMandatory: true,
      isPublic: true,
      createdById: harsha.id,
      items: {
        create: [
          { recordingId: recordings[14].id, order: 1 },
          { recordingId: recordings[1].id, order: 2 },
          { recordingId: recordings[0].id, order: 3 },
          { recordingId: recordings[8].id, order: 4 },
        ],
      },
    },
  });

  const securityPlaylist = await prisma.playlist.create({
    data: {
      name: "Security & Compliance",
      description: "Everything you need to know about MinIO security features.",
      isMandatory: false,
      isPublic: true,
      createdById: priya.id,
      items: {
        create: [
          { recordingId: recordings[8].id, order: 1 },
          { recordingId: recordings[11].id, order: 2 },
        ],
      },
    },
  });

  console.log("Created playlists");

  console.log("\nSeed completed successfully!");
  console.log(`  ${users.length} users`);
  console.log(`  ${series.length} series`);
  console.log(`  ${tagNames.length} tags`);
  console.log(`  ${recordings.length} recordings`);
  console.log(`  2 playlists`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
