"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { RexFormSchema, type RexFormData } from "@/lib/validations/rex";
import { useUploadThing } from "@/lib/uploadthing";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RexFormProps {
  initialData?: Partial<RexFormData>;
  rexId?: string;
  mode: "create" | "edit";
}

export function RexForm({ initialData, rexId, mode }: RexFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<string[]>(
    initialData?.tags?.map((t) => t.name) || []
  );
  const [currentTag, setCurrentTag] = useState("");
  
  // Upload states
  const [uploadedDocuments, setUploadedDocuments] = useState<
    Array<{ name: string; url: string; type: string; size: number }>
  >(initialData?.attachments || []);
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ name: string; url: string; type: string; size: number }>
  >([]);

  // UploadThing hooks
  const { startUpload: startDocumentUpload, isUploading: isUploadingDocuments } =
    useUploadThing("rexDocuments", {
      onClientUploadComplete: (files) => {
        const newDocs = files.map((f) => ({
          name: f.name,
          url: f.url,
          type: f.type,
          size: f.size,
        }));
        setUploadedDocuments((prev) => [...prev, ...newDocs]);
        toast({
          title: "Documents uploadés",
          description: `${files.length} document(s) ajouté(s) avec succès`,
        });
      },
      onUploadError: (error) => {
        toast({
          title: "Erreur d'upload",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const { startUpload: startImageUpload, isUploading: isUploadingImages } =
    useUploadThing("rexImages", {
      onClientUploadComplete: (files) => {
        const newImages = files.map((f) => ({
          name: f.name,
          url: f.url,
          type: f.type,
          size: f.size,
        }));
        setUploadedImages((prev) => [...prev, ...newImages]);
        toast({
          title: "Images uploadées",
          description: `${files.length} image(s) ajoutée(s) avec succès`,
        });
      },
      onUploadError: (error) => {
        toast({
          title: "Erreur d'upload",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const form = useForm<RexFormData>({
    resolver: zodResolver(RexFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      type: initialData?.type || "INTERVENTION",
      date: initialData?.date || new Date(),
      location: initialData?.location || "",
      description: initialData?.description || "",
      context: initialData?.context || "",
      actions: initialData?.actions || "",
      results: initialData?.results || "",
      analysis: initialData?.analysis || "",
      recommendations: initialData?.recommendations || "",
      gravity: initialData?.gravity || "SANS_GRAVITE",
      visibility: initialData?.visibility || "PRIVE",
      resources: initialData?.resources || "",
      status: initialData?.status || "BROUILLON",
    },
  });

  const handleAddTag = () => {
    if (currentTag && !tags.includes(currentTag) && tags.length < 10) {
      setTags([...tags, currentTag]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    await startDocumentUpload(fileArray);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    await startImageUpload(fileArray);
  };

  const handleRemoveDocument = (url: string) => {
    setUploadedDocuments(uploadedDocuments.filter((doc) => doc.url !== url));
  };

  const handleRemoveImage = (url: string) => {
    setUploadedImages(uploadedImages.filter((img) => img.url !== url));
  };

  const onSubmit = async (data: RexFormData) => {
    setIsLoading(true);

    try {
      // Préparer les données avec les fichiers uploadés et les tags
      const formData = {
        ...data,
        tags: tags.map((name) => ({ name })),
        attachments: [...uploadedDocuments, ...uploadedImages],
      };

      const url = mode === "create" ? "/api/rex" : `/api/rex/${rexId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde du REX");
      }

      const result = await response.json();

      toast({
        title: mode === "create" ? "REX créé" : "REX mis à jour",
        description:
          mode === "create"
            ? "Votre retour d'expérience a été créé avec succès"
            : "Votre retour d'expérience a été mis à jour avec succès",
      });

      router.push(`/rex/${result.id}`);
      router.refresh();
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsDraft = async () => {
    const data = form.getValues();
    data.status = "BROUILLON";
    await onSubmit(data);
  };

  const handleSubmitForValidation = async () => {
    const data = form.getValues();
    data.status = "EN_ATTENTE";
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="informations" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="informations">Informations</TabsTrigger>
            <TabsTrigger value="analyse">Analyse</TabsTrigger>
            <TabsTrigger value="fichiers">Fichiers</TabsTrigger>
            <TabsTrigger value="parametres">Paramètres</TabsTrigger>
          </TabsList>

          {/* ONGLET INFORMATIONS */}
          <TabsContent value="informations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>
                  Renseignez les informations de base du retour d'expérience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Intervention feu de véhicule A8"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Un titre clair et descriptif (5-200 caractères)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="INTERVENTION">
                              Intervention
                            </SelectItem>
                            <SelectItem value="EXERCICE">Exercice</SelectItem>
                            <SelectItem value="FORMATION">Formation</SelectItem>
                            <SelectItem value="TECHNIQUE">Technique</SelectItem>
                            <SelectItem value="ORGANISATIONNEL">
                              Organisationnel
                            </SelectItem>
                            <SelectItem value="AUTRE">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gravity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gravité *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez la gravité" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SANS_GRAVITE">
                              Sans gravité
                            </SelectItem>
                            <SelectItem value="FAIBLE">Faible</SelectItem>
                            <SelectItem value="MODEREE">Modérée</SelectItem>
                            <SelectItem value="GRAVE">Grave</SelectItem>
                            <SelectItem value="TRES_GRAVE">
                              Très grave
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date de l'événement *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: fr })
                                ) : (
                                  <span>Sélectionnez une date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                              locale={fr}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lieu *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Nice - Autoroute A8 PK 52"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez l'événement de manière claire et factuelle..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Description détaillée de l'événement (50-5000 caractères)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="context"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contexte</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez le contexte (météo, environnement, moyens disponibles...)"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Éléments de contexte pertinents (20-3000 caractères)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resources"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moyens engagés</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: 2 FPT, 1 VSAV, 1 VL, 12 sapeurs-pompiers..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Énumérez les moyens humains et matériels
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONGLET ANALYSE */}
          <TabsContent value="analyse" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analyse et retour d'expérience</CardTitle>
                <CardDescription>
                  Analysez l'événement et proposez des recommandations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="actions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actions menées</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez chronologiquement les actions entreprises..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Actions et décisions prises durant l'intervention
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="results"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Résultats</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Quels ont été les résultats et les conséquences..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Résultats obtenus et conséquences observées
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="analysis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Analyse *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Analysez ce qui a bien fonctionné et ce qui pourrait être amélioré..."
                          className="min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Points positifs, difficultés rencontrées, leçons apprises
                        (30-4000 caractères)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recommendations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommandations</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Proposez des recommandations concrètes et actionnables..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Recommandations pour améliorer les futures interventions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONGLET FICHIERS */}
          <TabsContent value="fichiers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  Ajoutez des documents (PDF, Word, Excel)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadingDocuments}
                    onClick={() =>
                      document.getElementById("document-upload")?.click()
                    }
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploadingDocuments
                      ? "Upload en cours..."
                      : "Ajouter des documents"}
                  </Button>
                  <input
                    id="document-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={handleDocumentUpload}
                  />
                  <span className="text-sm text-muted-foreground">
                    Max 16MB par fichier, 5 fichiers max
                  </span>
                </div>

                {uploadedDocuments.length > 0 && (
                  <div className="space-y-2">
                    {uploadedDocuments.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(doc.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(doc.url)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Images</CardTitle>
                <CardDescription>
                  Ajoutez des photos de l'intervention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadingImages}
                    onClick={() => document.getElementById("image-upload")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploadingImages ? "Upload en cours..." : "Ajouter des images"}
                  </Button>
                  <input
                    id="image-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <span className="text-sm text-muted-foreground">
                    Max 8MB par image, 10 images max
                  </span>
                </div>

                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {uploadedImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(img.url)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONGLET PARAMÈTRES */}
          <TabsContent value="parametres" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visibilité et partage</CardTitle>
                <CardDescription>
                  Définissez qui peut voir ce REX
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niveau de visibilité</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez la visibilité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PRIVE">
                            Privé (uniquement moi)
                          </SelectItem>
                          <SelectItem value="SDIS">
                            SDIS (tout mon SDIS)
                          </SelectItem>
                          <SelectItem value="REGIONAL">
                            Régional (ma région)
                          </SelectItem>
                          <SelectItem value="NATIONAL">
                            National (tous les SDIS)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Ajoutez des tags pour faciliter la recherche
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter un tag"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddTag}>
                    Ajouter
                  </Button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  {tags.length}/10 tags
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* BOUTONS D'ACTION */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Annuler
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveAsDraft}
              disabled={isLoading}
            >
              Enregistrer comme brouillon
            </Button>
            <Button
              type="button"
              onClick={handleSubmitForValidation}
              disabled={isLoading}
            >
              {isLoading ? "Enregistrement..." : "Soumettre pour validation"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
