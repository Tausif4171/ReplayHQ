"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import {
  UploadCloud,
  FileVideo,
  X,
  Check,
  CheckCircle,
  Sparkles,
  Brain,
  Upload,
  Calendar,
  User,
  Film,
  Tag,
  FileText,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Details" },
  { id: 3, label: "Publish" },
] as const;

const TEAM_MEMBERS = [
  "Krishna Mohan",
  "Aditya Singh",
  "Harshavardhana",
  "Farhan Patel",
  "Tausif Khan",
];

const SERIES_OPTIONS = [
  "Internal Learning Series",
  "Engineering Deep Dives",
  "Product Workshops",
  "Onboarding",
];

const ACCEPTED_TYPES: Record<string, string[]> = {
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/* ------------------------------------------------------------------ */
/*  Stepper                                                            */
/* ------------------------------------------------------------------ */

function Stepper({
  currentStep,
  className,
}: {
  currentStep: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isFuture = currentStep < step.id;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border-2 font-semibold transition-all duration-300",
                  isCompleted &&
                    "h-9 w-9 border-primary bg-primary text-primary-foreground",
                  isCurrent &&
                    "h-10 w-10 border-primary bg-primary/10 text-primary shadow-md shadow-primary/20",
                  isFuture &&
                    "h-9 w-9 border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm">{step.id}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  isCurrent && "text-primary",
                  isCompleted && "text-primary",
                  isFuture && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-3 mb-5 h-0.5 w-16 rounded-full transition-colors duration-500 sm:w-24",
                  currentStep > step.id + 1
                    ? "bg-primary"
                    : currentStep > step.id
                      ? "bg-primary/40"
                      : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Feature Toggle Card                                             */
/* ------------------------------------------------------------------ */

function AIToggleCard({
  icon: Icon,
  title,
  description,
  active,
  onToggle,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200",
        active
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-muted-foreground/30"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
          active
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 space-y-0.5">
        <p
          className={cn(
            "text-sm font-semibold transition-colors",
            active ? "text-foreground" : "text-foreground/80"
          )}
        >
          {title}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div
        className={cn(
          "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
          active ? "bg-primary" : "bg-muted-foreground/25"
        )}
      >
        <div
          className={cn(
            "h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            active ? "translate-x-3.5" : "translate-x-0"
          )}
        />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Upload Page                                                   */
/* ------------------------------------------------------------------ */

export default function UploadPage() {
  /* ---- State ---- */
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploaded, setIsUploaded] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [presenter, setPresenter] = useState("");
  const [series, setSeries] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [recordingDate, setRecordingDate] = useState(todayISO());
  const [aiTranscript, setAiTranscript] = useState(true);
  const [aiSummary, setAiSummary] = useState(true);
  const [isPublished, setIsPublished] = useState(false);

  const tagInputRef = useRef<HTMLInputElement>(null);

  /* ---- Upload simulation ---- */
  useEffect(() => {
    if (!file || isUploaded) return;

    const duration = 3000; // 3 seconds
    const interval = 50;
    const step = 100 / (duration / interval);
    let progress = 0;

    const timer = setInterval(() => {
      progress = Math.min(progress + step, 100);
      setUploadProgress(Math.round(progress));

      if (progress >= 100) {
        clearInterval(timer);
        // small delay before marking upload as complete
        setTimeout(() => {
          setIsUploaded(true);
        }, 300);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [file, isUploaded]);

  /* ---- Auto-advance to step 2 when upload completes ---- */
  useEffect(() => {
    if (isUploaded && currentStep === 1) {
      const timeout = setTimeout(() => setCurrentStep(2), 600);
      return () => clearTimeout(timeout);
    }
  }, [isUploaded, currentStep]);

  /* ---- Dropzone ---- */
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const droppedFile = acceptedFiles[0];
      setFile(droppedFile);
      setTitle(stripExtension(droppedFile.name));
      setUploadProgress(0);
      setIsUploaded(false);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 5 * 1024 * 1024 * 1024, // 5 GB
    multiple: false,
  });

  /* ---- Tag helpers ---- */
  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  /* ---- File removal ---- */
  const removeFile = () => {
    setFile(null);
    setUploadProgress(0);
    setIsUploaded(false);
    setTitle("");
  };

  /* ---- Navigation ---- */
  const goNext = () =>
    setCurrentStep((prev) => Math.min(prev + 1, 4) as 1 | 2 | 3);
  const goBack = () =>
    setCurrentStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3);

  /* ---- Publish ---- */
  const handlePublish = () => {
    setIsPublished(true);
    setCurrentStep(4 as number);
  };

  /* ---- Reset for "Upload Another" ---- */
  const resetAll = () => {
    setCurrentStep(1);
    setFile(null);
    setUploadProgress(0);
    setIsUploaded(false);
    setTitle("");
    setDescription("");
    setPresenter("");
    setSeries("");
    setTags([]);
    setTagInput("");
    setRecordingDate(todayISO());
    setAiTranscript(true);
    setAiSummary(true);
    setIsPublished(false);
  };

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  /* ---------- Success state ---------- */
  if (isPublished) {
    return (
      <div className="mx-auto max-w-3xl">
        <Stepper currentStep={4} className="mb-10" />

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-green-400/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <h2 className="mb-2 text-2xl font-bold tracking-tight">
            Recording Published!
          </h2>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            Your recording is being processed. AI transcription and summary will
            be ready in a few minutes.
          </p>

          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={resetAll}>
              Upload Another
            </Button>
            <Button size="lg">
              View Recording
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* ---- Page Header ---- */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Upload Recording</h1>
        <p className="mt-1 text-muted-foreground">
          Share knowledge with your team
        </p>
      </div>

      {/* ---- Stepper ---- */}
      <Stepper currentStep={currentStep} className="mb-10" />

      {/* ============================================================= */}
      {/*  STEP 1 - Upload File                                         */}
      {/* ============================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {!file ? (
            /* --- Dropzone --- */
            <div
              {...getRootProps()}
              className={cn(
                "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-20 text-center transition-all duration-300",
                isDragActive
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/5"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/[0.02]"
              )}
            >
              <input {...getInputProps()} />

              <div
                className={cn(
                  "mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
                  isDragActive
                    ? "bg-primary/15 text-primary scale-110"
                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}
              >
                <UploadCloud className="h-8 w-8" />
              </div>

              <p className="mb-1 text-base font-medium">
                {isDragActive
                  ? "Drop your recording here"
                  : "Drag & drop your recording here"}
              </p>

              <p className="mb-5 text-sm text-muted-foreground">or</p>

              <Button
                type="button"
                size="lg"
                className="pointer-events-none shadow-md"
              >
                Browse Files
              </Button>

              <p className="mt-5 text-xs text-muted-foreground">
                MP4, WebM, MOV up to 5GB
              </p>
            </div>
          ) : (
            /* --- File selected / uploading --- */
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* File icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileVideo className="h-6 w-6" />
                  </div>

                  {/* File info */}
                  <div className="flex-1 space-y-1">
                    <p className="font-medium leading-tight">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} &middot; {file.type.split("/")[1]?.toUpperCase() ?? "VIDEO"}
                    </p>
                  </div>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Progress */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {isUploaded ? "Upload complete" : "Uploading..."}
                    </span>
                    <span className="font-medium tabular-nums">
                      {uploadProgress}%
                    </span>
                  </div>
                  <Progress
                    value={uploadProgress}
                    className={cn(
                      "h-2 transition-all",
                      isUploaded && "[&>div]:bg-green-500"
                    )}
                  />
                </div>

                {isUploaded && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Ready to continue
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 1 navigation */}
          {isUploaded && (
            <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Button onClick={goNext} size="lg">
                Continue to Details
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/*  STEP 2 - Details                                             */}
      {/* ============================================================= */}
      {currentStep === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* --- Form Fields --- */}
          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label
                htmlFor="title"
                className="text-sm font-medium leading-none"
              >
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="title"
                placeholder="Give your recording a title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="description"
                  className="text-sm font-medium leading-none"
                >
                  Description{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {description.length}/500
                </span>
              </div>
              <textarea
                id="description"
                rows={4}
                maxLength={500}
                placeholder="What is this recording about? Key topics, context, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            {/* Presenter & Series (side by side) */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Presenter
                </label>
                <Select value={presenter} onValueChange={setPresenter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select presenter" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_MEMBERS.map((member) => (
                      <SelectItem key={member} value={member}>
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Series
                </label>
                <Select value={series} onValueChange={setSeries}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select series" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERIES_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">
                      + Create new series
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Tags</label>
              <div
                className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring cursor-text"
                onClick={() => tagInputRef.current?.focus()}
              >
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 pl-2.5 pr-1 py-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTag(tag);
                      }}
                      className="ml-0.5 rounded-sm p-0.5 hover:bg-foreground/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? "Type a tag and press Enter" : ""}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-[120px]"
                />
              </div>
            </div>

            {/* Recording Date */}
            <div className="space-y-2">
              <label
                htmlFor="recordingDate"
                className="text-sm font-medium leading-none"
              >
                Recording Date
              </label>
              <Input
                id="recordingDate"
                type="date"
                value={recordingDate}
                onChange={(e) => setRecordingDate(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <Separator />

          {/* --- AI Processing Toggles --- */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">AI Processing</h3>
              <p className="text-xs text-muted-foreground">
                Enhance your recording with AI-powered features
              </p>
            </div>

            <div className="space-y-3">
              <AIToggleCard
                icon={Sparkles}
                title="Auto-generate transcript"
                description="Use AI to transcribe audio to searchable text"
                active={aiTranscript}
                onToggle={() => setAiTranscript((prev) => !prev)}
              />
              <AIToggleCard
                icon={Brain}
                title="Generate AI summary"
                description="Extract key takeaways and action items"
                active={aiSummary}
                onToggle={() => setAiSummary((prev) => !prev)}
              />
            </div>
          </div>

          {/* Step 2 navigation */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" size="lg" onClick={goBack}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              size="lg"
              onClick={goNext}
              disabled={!title.trim()}
            >
              Review & Publish
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  STEP 3 - Review & Publish                                    */}
      {/* ============================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Your Recording</CardTitle>
              <CardDescription>
                Make sure everything looks good before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* File info */}
              {file && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileVideo className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} &middot;{" "}
                      {file.type.split("/")[1]?.toUpperCase() ?? "VIDEO"}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Details grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewRow icon={FileText} label="Title" value={title} />
                <ReviewRow
                  icon={User}
                  label="Presenter"
                  value={presenter || "Not specified"}
                />
                <ReviewRow
                  icon={Film}
                  label="Series"
                  value={
                    series === "__new__"
                      ? "New series"
                      : series || "Not specified"
                  }
                />
                <ReviewRow
                  icon={Calendar}
                  label="Recording Date"
                  value={
                    recordingDate
                      ? new Date(recordingDate + "T00:00:00").toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : "Not specified"
                  }
                />
              </div>

              {/* Description */}
              {description && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </p>
                    <p className="text-sm leading-relaxed">{description}</p>
                  </div>
                </>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* AI features */}
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  AI Features
                </p>
                <div className="flex flex-wrap gap-2">
                  {aiTranscript && (
                    <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                      <Sparkles className="h-3 w-3" />
                      Auto-transcription
                    </div>
                  )}
                  {aiSummary && (
                    <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                      <Brain className="h-3 w-3" />
                      AI Summary
                    </div>
                  )}
                  {!aiTranscript && !aiSummary && (
                    <p className="text-sm text-muted-foreground">
                      No AI features enabled
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 navigation */}
          <div className="flex justify-between">
            <Button variant="outline" size="lg" onClick={goBack}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" size="lg">
                Save as Draft
              </Button>
              <Button size="lg" onClick={handlePublish}>
                <Upload className="mr-1 h-4 w-4" />
                Publish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small review row helper                                            */
/* ------------------------------------------------------------------ */

function ReviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
