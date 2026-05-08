"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronsUpDown,
  ImageIcon,
  Loader2,
  Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm, type UseFormRegister } from "react-hook-form";

import {
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  cn
} from "@workspace/ui";

import {
  buildCreateLandingPayload,
  createLanding,
  fetchCreateTemplates,
  fetchLandingNameAvailability,
  fetchLandingPublicIdSuggestion,
  isValidPublicId,
  type GeoOption,
  type TemplateOption,
  type VariantOption
} from "../../lib/api/landings";
import {
  createLandingStepFields,
  createLandingWizardSchema,
  type CreateLandingWizardValues
} from "../../lib/landings/create-wizard";

const createQueryKeys = {
  nameAvailability: (name: string) => ["landings", "name-availability", name] as const,
  publicIdSuggestion: (geoId: string, categoryId: string, variantId: string) =>
    ["landings", "public-id-suggestion", geoId, categoryId, variantId] as const,
  templates: (geoId: string) => ["landings", "create", "templates", geoId] as const
};

const steps = [
  { title: "Name", description: "Campaign label" },
  { title: "GEO", description: "Market locale" },
  { title: "Template", description: "Page base" },
  { title: "Variant", description: "Flow type" },
  { title: "Public ID", description: "Stable slug" }
] as const;

type CreateLandingWizardProps = {
  geos: GeoOption[];
  geosLoading: boolean;
  variants: VariantOption[];
  variantsLoading: boolean;
};

function CreateLandingWizard({
  geos,
  geosLoading,
  variants,
  variantsLoading
}: CreateLandingWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(0);
  const [geoOpen, setGeoOpen] = React.useState(false);
  const [publicIdEdited, setPublicIdEdited] = React.useState(false);
  const form = useForm<CreateLandingWizardValues>({
    defaultValues: {
      geoId: "",
      name: "",
      publicId: "",
      templateId: "",
      variantId: ""
    },
    mode: "onChange",
    resolver: zodResolver(createLandingWizardSchema)
  });

  const name = form.watch("name");
  const geoId = form.watch("geoId");
  const templateId = form.watch("templateId");
  const variantId = form.watch("variantId");
  const publicId = form.watch("publicId");
  const debouncedName = useDebouncedValue(name.trim(), 350);

  const selectedGeo = geos.find((geo) => geo.id === geoId);
  const templatesQuery = useQuery({
    enabled: open && Boolean(geoId),
    queryKey: createQueryKeys.templates(geoId),
    queryFn: () => fetchCreateTemplates(geoId)
  });
  const templates = templatesQuery.data ?? [];
  const selectedTemplate = templates.find((template) => template.id === templateId);
  const selectedCategoryId =
    selectedTemplate?.category?.id ?? selectedTemplate?.categoryId ?? "";
  const selectedVariant = variants.find((variant) => variant.id === variantId);

  const nameAvailabilityQuery = useQuery({
    enabled: open && debouncedName.length >= 2,
    queryKey: createQueryKeys.nameAvailability(debouncedName),
    queryFn: () => fetchLandingNameAvailability(debouncedName),
    retry: false,
    staleTime: 0
  });
  const publicIdSuggestionQuery = useQuery({
    enabled: open && Boolean(geoId && selectedCategoryId && variantId),
    queryKey: createQueryKeys.publicIdSuggestion(geoId, selectedCategoryId, variantId),
    queryFn: () =>
      fetchLandingPublicIdSuggestion({
        categoryId: selectedCategoryId,
        geoId,
        variantId
      })
  });
  const createMutation = useMutation({
    mutationFn: createLanding,
    onSuccess: async (landing) => {
      await queryClient.invalidateQueries({ queryKey: ["landings"] });
      closeAndReset();
      router.push(`/dashboard/landings/${landing.id}/edit`);
    }
  });

  React.useEffect(() => {
    if (
      open &&
      debouncedName.length >= 2 &&
      nameAvailabilityQuery.data &&
      nameAvailabilityQuery.data.name === debouncedName
    ) {
      if (!nameAvailabilityQuery.data.available) {
        form.setError("name", {
          message: "A landing with this name already exists.",
          type: "validate"
        });
      } else if (form.formState.errors.name?.type === "validate") {
        form.clearErrors("name");
      }
    }
  }, [debouncedName, form, nameAvailabilityQuery.data, open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setPublicIdEdited(false);
    form.setValue("publicId", "", { shouldValidate: false });
  }, [form, geoId, open, templateId, variantId]);

  React.useEffect(() => {
    if (publicIdSuggestionQuery.data?.publicId && !publicIdEdited) {
      form.setValue("publicId", publicIdSuggestionQuery.data.publicId, {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }, [form, publicIdEdited, publicIdSuggestionQuery.data]);

  const nameUnavailable =
    debouncedName.length >= 2 &&
    nameAvailabilityQuery.data?.name === debouncedName &&
    nameAvailabilityQuery.data?.available === false;
  const canUseName =
    debouncedName.length >= 2 &&
    nameAvailabilityQuery.data?.name === debouncedName &&
    !nameAvailabilityQuery.isFetching &&
    nameAvailabilityQuery.data?.available === true;
  const currentFields = createLandingStepFields[activeStep];
  const submitError = createMutation.error
    ? getMutationMessage(createMutation.error)
    : null;

  const closeAndReset = () => {
    setOpen(false);
    setActiveStep(0);
    setGeoOpen(false);
    setPublicIdEdited(false);
    createMutation.reset();
    form.reset();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    closeAndReset();
  };

  const goNext = async () => {
    const isStepValid = await form.trigger([...currentFields]);

    if (!isStepValid) {
      return;
    }

    if (activeStep === 0) {
      if (name !== debouncedName || nameAvailabilityQuery.isFetching) {
        form.setError("name", {
          message: "Wait for the name availability check.",
          type: "validate"
        });
        return;
      }

      if (nameAvailabilityQuery.isError) {
        form.setError("name", {
          message: "Failed to check name availability. Please try again.",
          type: "validate"
        });
        return;
      }

      if (nameUnavailable || !canUseName) {
        form.setError("name", {
          message: "A landing with this name already exists.",
          type: "validate"
        });
        return;
      }
    }

    if (activeStep === 2 && !selectedCategoryId) {
      form.setError("templateId", {
        message: "Select a template with an assigned category.",
        type: "validate"
      });
      return;
    }

    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const onSubmit = form.handleSubmit((values) => {
    if (!selectedTemplate) {
      form.setError("templateId", {
        message: "Select a template.",
        type: "validate"
      });
      return;
    }

    if (!isValidPublicId(values.publicId)) {
      form.setError("publicId", {
        message: "Use lowercase letters, numbers, and hyphens.",
        type: "validate"
      });
      return;
    }

    createMutation.mutate(
      buildCreateLandingPayload({
        geoId: values.geoId,
        name: values.name,
        publicId: values.publicId,
        template: selectedTemplate,
        variantId: values.variantId
      })
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create landing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
        <form onSubmit={onSubmit} className="flex max-h-[92vh] flex-col">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>Create landing</DialogTitle>
            <DialogDescription>
              Build a draft landing from catalog data, then continue in the editor.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b px-6 py-4">
            <Stepper activeStep={activeStep} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {activeStep === 0 ? (
              <NameStep
                error={form.formState.errors.name?.message}
                nameUnavailable={nameUnavailable}
                checking={nameAvailabilityQuery.isFetching}
                available={canUseName}
                register={form.register}
              />
            ) : null}

            {activeStep === 1 ? (
              <GeoStep
                error={form.formState.errors.geoId?.message}
                geos={geos}
                loading={geosLoading}
                open={geoOpen}
                selectedGeo={selectedGeo}
                onOpenChange={setGeoOpen}
                onSelect={(nextGeoId) => {
                  form.setValue("geoId", nextGeoId, {
                    shouldDirty: true,
                    shouldValidate: true
                  });
                  form.setValue("templateId", "", {
                    shouldDirty: true,
                    shouldValidate: false
                  });
                  setGeoOpen(false);
                }}
              />
            ) : null}

            {activeStep === 2 ? (
              <TemplateStep
                error={form.formState.errors.templateId?.message}
                loading={templatesQuery.isLoading}
                selectedTemplateId={templateId}
                templates={templates}
                onSelect={(nextTemplate) => {
                  if (!getTemplateCategoryId(nextTemplate)) {
                    return;
                  }

                  form.setValue("templateId", nextTemplate.id, {
                    shouldDirty: true,
                    shouldValidate: true
                  });
                }}
              />
            ) : null}

            {activeStep === 3 ? (
              <VariantStep
                error={form.formState.errors.variantId?.message}
                loading={variantsLoading}
                selectedVariantId={variantId}
                variants={variants}
                onSelect={(nextVariantId) => {
                  form.setValue("variantId", nextVariantId, {
                    shouldDirty: true,
                    shouldValidate: true
                  });
                }}
              />
            ) : null}

            {activeStep === 4 ? (
              <PublicIdStep
                error={form.formState.errors.publicId?.message}
                geo={selectedGeo}
                publicId={publicId}
                suggestion={publicIdSuggestionQuery.data?.publicId}
                suggestionLoading={publicIdSuggestionQuery.isFetching}
                template={selectedTemplate}
                variant={selectedVariant}
                register={form.register}
                onEdited={() => setPublicIdEdited(true)}
              />
            ) : null}

            {submitError ? (
              <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (activeStep === 0) {
                  closeAndReset();
                } else {
                  setActiveStep((step) => step - 1);
                }
              }}
            >
              {activeStep === 0 ? (
                "Cancel"
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </>
              )}
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Create draft
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ activeStep }: { activeStep: number }) {
  return (
    <ol className="grid gap-2 md:grid-cols-5">
      {steps.map((step, index) => {
        const complete = index < activeStep;
        const active = index === activeStep;

        return (
          <li
            key={step.title}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-md border px-3 py-2",
              active && "border-primary bg-primary/5",
              complete && "border-primary/40 bg-accent"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                active && "border-primary bg-primary text-primary-foreground",
                complete && "border-primary bg-primary text-primary-foreground"
              )}
            >
              {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{step.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {step.description}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function NameStep({
  available,
  checking,
  error,
  nameUnavailable,
  register
}: {
  available: boolean;
  checking: boolean;
  error?: string;
  nameUnavailable: boolean;
  register: UseFormRegister<CreateLandingWizardValues>;
}) {
  return (
    <section className="space-y-4">
      <StepHeading
        title="Name the landing"
        description="Use a unique operational name that your team can recognize later."
      />
      <div className="max-w-xl space-y-2">
        <Input
          aria-label="Landing name"
          autoFocus
          placeholder="Spring campaign US"
          {...register("name")}
        />
        <ValidationLine
          error={error}
          fallback={
            checking
              ? "Checking name availability..."
              : available
                ? "Name is available."
                : nameUnavailable
                  ? "A landing with this name already exists."
                  : "Name must be unique across active landings."
          }
          success={available}
        />
      </div>
    </section>
  );
}

function GeoStep({
  error,
  geos,
  loading,
  open,
  selectedGeo,
  onOpenChange,
  onSelect
}: {
  error?: string;
  geos: GeoOption[];
  loading: boolean;
  open: boolean;
  selectedGeo?: GeoOption;
  onOpenChange: (open: boolean) => void;
  onSelect: (geoId: string) => void;
}) {
  return (
    <section className="space-y-4">
      <StepHeading
        title="Choose GEO"
        description="Select the locale this draft will be built for."
      />
      <div className="max-w-xl space-y-2">
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedGeo ? (
                <span className="flex min-w-0 items-center gap-2">
                  <GeoFlag geo={selectedGeo} />
                  <span className="font-medium">{selectedGeo.code}</span>
                  <span className="truncate text-muted-foreground">
                    {selectedGeo.name}
                  </span>
                </span>
              ) : (
                "Select GEO"
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(28rem,calc(100vw-2rem))] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search GEO..." />
              <CommandList>
                <CommandEmpty>
                  {loading ? "Loading GEO catalog..." : "No GEO found."}
                </CommandEmpty>
                <CommandGroup>
                  {geos.map((geo) => (
                    <CommandItem
                      key={geo.id}
                      value={`${geo.code} ${geo.name}`}
                      onSelect={() => onSelect(geo.id)}
                    >
                      <GeoFlag geo={geo} />
                      <span className="font-medium">{geo.code}</span>
                      <span className="truncate text-muted-foreground">{geo.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <ValidationLine error={error} fallback="Templates will be filtered by GEO." />
      </div>
    </section>
  );
}

function TemplateStep({
  error,
  loading,
  selectedTemplateId,
  templates,
  onSelect
}: {
  error?: string;
  loading: boolean;
  selectedTemplateId: string;
  templates: TemplateOption[];
  onSelect: (template: TemplateOption) => void;
}) {
  return (
    <section className="space-y-4">
      <StepHeading
        title="Choose template"
        description="Template defines the page base and supplies the required category."
      />
      {loading ? (
        <CardGridSkeleton />
      ) : templates.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const categoryId = getTemplateCategoryId(template);
            const selected = selectedTemplateId === template.id;

            return (
              <button
                key={template.id}
                type="button"
                disabled={!categoryId}
                onClick={() => onSelect(template)}
                className={cn(
                  "grid min-h-56 gap-3 rounded-md border bg-card p-3 text-left transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55",
                  selected && "border-primary ring-1 ring-primary"
                )}
              >
                <TemplatePreview template={template} />
                <span className="min-w-0 space-y-1">
                  <span className="block truncate text-sm font-medium">
                    {template.name}
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {template.description ?? "Ready-to-edit landing template."}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <Badge variant="outline">
                    {template.category?.name ?? "No category"}
                  </Badge>
                  {!categoryId ? (
                    <span className="text-xs text-destructive">Category required</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyPanel text="No active public templates are available for this GEO." />
      )}
      <ValidationLine
        error={error}
        fallback="Only templates with category can be used."
      />
    </section>
  );
}

function VariantStep({
  error,
  loading,
  selectedVariantId,
  variants,
  onSelect
}: {
  error?: string;
  loading: boolean;
  selectedVariantId: string;
  variants: VariantOption[];
  onSelect: (variantId: string) => void;
}) {
  return (
    <section className="space-y-4">
      <StepHeading
        title="Choose variant"
        description="Variant describes the conversion flow this landing will use."
      />
      {loading ? (
        <CardGridSkeleton />
      ) : variants.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {variants.map((variant) => {
            const selected = selectedVariantId === variant.id;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => onSelect(variant.id)}
                className={cn(
                  "min-h-36 rounded-md border bg-card p-4 text-left transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected && "border-primary ring-1 ring-primary"
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-medium">{variant.name}</span>
                    <span className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                      {variant.description ?? "Reusable landing flow variant."}
                    </span>
                  </span>
                  {variant.icon ? (
                    <Badge variant="outline" className="shrink-0">
                      {variant.icon}
                    </Badge>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyPanel text="No active variants are available." />
      )}
      <ValidationLine error={error} fallback="Choose one variant for the draft." />
    </section>
  );
}

function PublicIdStep({
  error,
  geo,
  publicId,
  register,
  suggestion,
  suggestionLoading,
  template,
  variant,
  onEdited
}: {
  error?: string;
  geo?: GeoOption;
  publicId: string;
  register: UseFormRegister<CreateLandingWizardValues>;
  suggestion?: string;
  suggestionLoading: boolean;
  template?: TemplateOption;
  variant?: VariantOption;
  onEdited: () => void;
}) {
  return (
    <section className="space-y-4">
      <StepHeading
        title="Confirm Public ID"
        description="This stable ID is generated from GEO, category, variant, and the next available number."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-2">
          <Input
            aria-label="Public ID"
            placeholder={suggestionLoading ? "Generating..." : "us-diabetes-form-1"}
            {...register("publicId", {
              onChange: onEdited
            })}
          />
          <ValidationLine
            error={error}
            fallback={
              suggestionLoading
                ? "Generating the next available ID..."
                : suggestion
                  ? `Suggested: ${suggestion}`
                  : "Use lowercase letters, numbers, and hyphens."
            }
            success={Boolean(publicId && isValidPublicId(publicId))}
          />
        </div>
        <div className="rounded-md border bg-card p-3 text-sm">
          <p className="font-medium">Draft summary</p>
          <dl className="mt-3 space-y-2 text-xs">
            <SummaryRow label="GEO" value={geo ? `${geo.code} - ${geo.name}` : "None"} />
            <SummaryRow
              label="Category"
              value={template?.category?.name ?? "Template category"}
            />
            <SummaryRow label="Template" value={template?.name ?? "None"} />
            <SummaryRow label="Variant" value={variant?.name ?? "None"} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function StepHeading({ description, title }: { description: string; title: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ValidationLine({
  error,
  fallback,
  success
}: {
  error?: string;
  fallback: string;
  success?: boolean;
}) {
  return (
    <p
      className={cn(
        "text-sm text-muted-foreground",
        error && "text-destructive",
        success && !error && "text-emerald-600 dark:text-emerald-400"
      )}
    >
      {error ?? fallback}
    </p>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function TemplatePreview({ template }: { template: TemplateOption }) {
  if (template.thumbnailUrl) {
    return (
      <span
        className="block aspect-[16/9] rounded-md border bg-muted"
        style={{
          backgroundImage: `url(${template.thumbnailUrl})`,
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      />
    );
  }

  return (
    <span className="flex aspect-[16/9] items-center justify-center rounded-md border bg-muted text-muted-foreground">
      <ImageIcon className="h-6 w-6" aria-hidden="true" />
    </span>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-44 rounded-md" />
      ))}
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function GeoFlag({ geo }: { geo: GeoOption }) {
  if (geo.flagUrl) {
    return (
      <span
        aria-hidden="true"
        className="h-5 w-5 rounded-full bg-cover bg-center"
        style={{ backgroundImage: `url(${geo.flagUrl})` }}
      />
    );
  }

  return (
    <span className="text-base" aria-hidden="true">
      {geo.flagEmoji ?? "o"}
    </span>
  );
}

function getTemplateCategoryId(template: TemplateOption) {
  return template.category?.id ?? template.categoryId ?? "";
}

function getMutationMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unable to create the landing. Check the API response and try again.";
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
}

export { CreateLandingWizard };
